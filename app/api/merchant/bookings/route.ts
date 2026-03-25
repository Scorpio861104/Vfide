/**
 * Merchant Service Booking API
 *
 * GET   — List available slots / bookings
 * POST  — Create booking slot (merchant) or book appointment (customer)
 * PATCH — Update booking status
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function getAuthAddress(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const address = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return address;
}

// ─────────────────────────── GET: List slots or bookings
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get('merchant');
  const productId = searchParams.get('product_id');
  const date = searchParams.get('date');
  const view = searchParams.get('view') || 'slots';  // slots or bookings

  if (!merchant || !ADDRESS_LIKE_REGEX.test(merchant)) {
    return NextResponse.json({ error: 'merchant address required' }, { status: 400 });
  }

  try {
    if (view === 'bookings') {
      // Merchant view — requires auth
      const authAddress = await getAuthAddress(request);
      if (authAddress instanceof NextResponse) return authAddress;
      if (authAddress !== merchant.toLowerCase()) {
        return NextResponse.json({ error: 'Can only view own bookings' }, { status: 403 });
      }

      const conditions = ['b.merchant_address = $1'];
      const params: (string | number)[] = [merchant.toLowerCase()];
      let pi = 2;

      if (date && DATE_REGEX.test(date)) {
        conditions.push(`b.booking_date = $${pi++}`);
        params.push(date);
      }
      if (productId) {
        conditions.push(`b.product_id = $${pi++}`);
        params.push(Number(productId));
      }

      const result = await query(
        `SELECT b.*, p.name as service_name
         FROM merchant_bookings b
         LEFT JOIN merchant_products p ON b.product_id = p.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY b.booking_date, b.start_time`,
        params
      );

      return NextResponse.json({ bookings: result.rows });
    }

    // Public: available slots for a product on a date
    if (!productId) {
      return NextResponse.json({ error: 'product_id required for slot view' }, { status: 400 });
    }
    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
    }

    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    // Get recurring + one-off slots for this day
    const slotsResult = await query(
      `SELECT s.id, s.start_time, s.end_time, s.max_bookings,
              (SELECT COUNT(*) FROM merchant_bookings b
               WHERE b.slot_id = s.id AND b.booking_date = $3
               AND b.status NOT IN ('cancelled')) as booked_count
       FROM merchant_service_slots s
       WHERE s.merchant_address = $1 AND s.product_id = $2
         AND s.status = 'active'
         AND (s.day_of_week = $4 OR s.specific_date = $3)
       ORDER BY s.start_time`,
      [merchant.toLowerCase(), Number(productId), date, dayOfWeek]
    );

    // Filter to slots with availability
    const availableSlots = slotsResult.rows.filter(
      s => Number(s?.booked_count ?? 0) < Number(s?.max_bookings ?? 1)
    );

    return NextResponse.json({ slots: availableSlots, date });
  } catch (error) {
    logger.error('[Bookings GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create slot or book appointment
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { action } = body;

    if (action === 'create_slot') {
      // Merchant creates availability slots
      const { product_id, day_of_week, specific_date, start_time, end_time, max_bookings } = body;

      if (typeof product_id !== 'number') {
        return NextResponse.json({ error: 'product_id required' }, { status: 400 });
      }
      if (typeof start_time !== 'string' || !TIME_REGEX.test(start_time)) {
        return NextResponse.json({ error: 'start_time required (HH:MM)' }, { status: 400 });
      }
      if (typeof end_time !== 'string' || !TIME_REGEX.test(end_time)) {
        return NextResponse.json({ error: 'end_time required (HH:MM)' }, { status: 400 });
      }

      // Verify product ownership and type
      const productResult = await query(
        "SELECT id FROM merchant_products WHERE id = $1 AND merchant_address = $2 AND product_type = 'service'",
        [product_id, authAddress]
      );
      if (productResult.rows.length === 0) {
        return NextResponse.json({ error: 'Service product not found' }, { status: 404 });
      }

      const hasDayOfWeek = typeof day_of_week === 'number' && day_of_week >= 0 && day_of_week <= 6;
      const hasSpecificDate = typeof specific_date === 'string' && DATE_REGEX.test(specific_date);

      if (!hasDayOfWeek && !hasSpecificDate) {
        return NextResponse.json({ error: 'day_of_week (0-6) or specific_date required' }, { status: 400 });
      }

      // Limit slots per merchant
      const countResult = await query(
        'SELECT COUNT(*) as count FROM merchant_service_slots WHERE merchant_address = $1',
        [authAddress]
      );
      if (Number(countResult.rows[0]?.count) >= 200) {
        return NextResponse.json({ error: 'Maximum 200 slots per merchant' }, { status: 400 });
      }

      const result = await query(
        `INSERT INTO merchant_service_slots
         (merchant_address, product_id, day_of_week, specific_date, start_time, end_time, max_bookings)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          authAddress,
          product_id,
          hasDayOfWeek ? day_of_week : null,
          hasSpecificDate ? specific_date : null,
          start_time,
          end_time,
          typeof max_bookings === 'number' ? Math.max(1, Math.floor(max_bookings)) : 1,
        ]
      );

      return NextResponse.json({ slot: result.rows[0] }, { status: 201 });
    }

    // Default: customer books an appointment
    const { merchant_address, product_id, slot_id, booking_date,
            customer_email, customer_name, notes } = body;

    if (typeof merchant_address !== 'string' || !ADDRESS_LIKE_REGEX.test(merchant_address)) {
      return NextResponse.json({ error: 'Valid merchant_address required' }, { status: 400 });
    }
    if (typeof product_id !== 'number') {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    }
    if (typeof booking_date !== 'string' || !DATE_REGEX.test(booking_date)) {
      return NextResponse.json({ error: 'booking_date required (YYYY-MM-DD)' }, { status: 400 });
    }

    // Date must be in the future
    const bookDate = new Date(booking_date + 'T00:00:00Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookDate < today) {
      return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 });
    }

    // Get slot
    let slotStartTime: string;
    let slotEndTime: string;

    if (typeof slot_id === 'number') {
      const slotResult = await query(
        "SELECT * FROM merchant_service_slots WHERE id = $1 AND product_id = $2 AND status = 'active'",
        [slot_id, product_id]
      );
      if (slotResult.rows.length === 0) {
        return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
      }

      const slot = slotResult.rows[0]!;
      slotStartTime = slot.start_time as string;
      slotEndTime = slot.end_time as string;

      // Check availability
      const bookedResult = await query(
        "SELECT COUNT(*) as count FROM merchant_bookings WHERE slot_id = $1 AND booking_date = $2 AND status != 'cancelled'",
        [slot_id, booking_date]
      );
      if (Number(bookedResult.rows[0]?.count) >= Number(slot.max_bookings)) {
        return NextResponse.json({ error: 'Slot is fully booked' }, { status: 409 });
      }
    } else {
      return NextResponse.json({ error: 'slot_id required' }, { status: 400 });
    }

    // Check duplicate booking
    const dupResult = await query(
      "SELECT id FROM merchant_bookings WHERE customer_address = $1 AND product_id = $2 AND booking_date = $3 AND status != 'cancelled'",
      [authAddress, product_id, booking_date]
    );
    if (dupResult.rows.length > 0) {
      return NextResponse.json({ error: 'You already have a booking for this service on this date' }, { status: 409 });
    }

    const result = await query(
      `INSERT INTO merchant_bookings
       (merchant_address, product_id, slot_id, customer_address, customer_email,
        customer_name, booking_date, start_time, end_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        (merchant_address as string).toLowerCase(),
        product_id,
        slot_id,
        authAddress,
        typeof customer_email === 'string' ? customer_email.slice(0, 254) : null,
        typeof customer_name === 'string' ? customer_name.slice(0, 200) : null,
        booking_date,
        slotStartTime,
        slotEndTime,
        typeof notes === 'string' ? notes.slice(0, 1000) : null,
      ]
    );

    return NextResponse.json({ booking: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Bookings POST] Error:', error);
    return NextResponse.json({ error: 'Failed to process booking' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update booking status
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { id, status } = body;

    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }
    if (typeof status !== 'string' || !['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required' }, { status: 400 });
    }

    // Merchant or customer can update
    const existing = await query(
      'SELECT * FROM merchant_bookings WHERE id = $1 AND (merchant_address = $2 OR customer_address = $2)',
      [id, authAddress]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Customers can only cancel
    const booking = existing.rows[0]!;
    if (booking.customer_address === authAddress && status !== 'cancelled') {
      return NextResponse.json({ error: 'Customers can only cancel bookings' }, { status: 403 });
    }

    const result = await query(
      'UPDATE merchant_bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    return NextResponse.json({ booking: result.rows[0] });
  } catch (error) {
    logger.error('[Bookings PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
