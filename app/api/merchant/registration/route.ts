import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validateAddress, validateStringLength, validateOptionalStringLength, createErrorResponse } from '@/lib/inputValidation';

/**
 * POST /api/merchant/registration
 * Register as a merchant
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per hour (registration should be infrequent)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 5, windowMs: 3600000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const client = await getClient();
  
  try {
    const body = await request.json();
    const { 
      ownerAddress, 
      businessName, 
      businessType,
      businessDescription,
      websiteUrl,
      contactEmail,
      contactPhone 
    } = body;

    // Validate inputs
    const validatedAddress = validateAddress(ownerAddress);
    const validatedBusinessName = validateStringLength(businessName, 'Business name', 3, 100);
    const validatedBusinessType = validateStringLength(businessType, 'Business type', 3, 50);
    const validatedDescription = validateStringLength(businessDescription, 'Business description', 10, 1000);
    const validatedEmail = validateStringLength(contactEmail, 'Contact email', 5, 100);
    
    // Optional fields
    const validatedWebsite = validateOptionalStringLength(websiteUrl, 200);
    const validatedPhone = validateOptionalStringLength(contactPhone, 20);

    await client.query('BEGIN');

    // Check if user exists
    const userResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [validatedAddress]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        createErrorResponse('User not found. Please create an account first.'),
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;

    // Check if already registered as merchant
    const existingMerchant = await client.query(
      'SELECT id FROM merchants WHERE user_id = $1',
      [userId]
    );

    if (existingMerchant.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        createErrorResponse('Already registered as a merchant'),
        { status: 400 }
      );
    }

    // Create merchant record
    const merchantResult = await client.query(
      `INSERT INTO merchants (
        user_id,
        business_name,
        business_type,
        business_description,
        website_url,
        contact_email,
        contact_phone,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
      RETURNING *`,
      [
        userId,
        validatedBusinessName,
        validatedBusinessType,
        validatedDescription,
        validatedWebsite,
        validatedEmail,
        validatedPhone
      ]
    );

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'merchant_registration', 'Merchant Registration Received', 
       'Your merchant registration has been submitted and is pending review.', NOW())`,
      [userId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      merchant: merchantResult.rows[0],
      message: 'Merchant registration submitted successfully. You will be notified once reviewed.',
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Merchant Registration API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/merchant/registration?userAddress=0x...
 * Get merchant registration status
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const validatedAddress = validateAddress(userAddress);

    const client = await getClient();

    try {
      const result = await client.query(
        `SELECT m.*, u.wallet_address
         FROM merchants m
         JOIN users u ON m.user_id = u.id
         WHERE u.wallet_address = $1`,
        [validatedAddress]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({
          registered: false,
          merchant: null,
        });
      }

      return NextResponse.json({
        registered: true,
        merchant: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Merchant Registration GET API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  }
}
