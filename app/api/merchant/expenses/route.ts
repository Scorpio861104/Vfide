import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const createExpenseSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().min(1).max(16).optional().default('USD'),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional().default(''),
  receiptImageUrl: z.union([z.string().trim().url().max(2000), z.literal(''), z.null()]).optional(),
  expenseDate: z.string().trim().regex(DATE_ONLY_REGEX).optional(),
});

const updateExpenseSchema = z.object({
  id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive().max(1_000_000_000).optional(),
  currency: z.string().trim().min(1).max(16).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  receiptImageUrl: z.union([z.string().trim().url().max(2000), z.literal(''), z.null()]).optional(),
  expenseDate: z.string().trim().regex(DATE_ONLY_REGEX).optional(),
}).refine(
  (value) => Object.entries(value).some(([key, fieldValue]) => key !== 'id' && fieldValue !== undefined),
  { message: 'At least one field must be updated' },
);

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function serializeExpenseRow(row: Record<string, unknown>) {
  const expenseDate = row.expense_date ? String(row.expense_date).slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    id: Number(row.id ?? 0),
    merchantAddress: String(row.merchant_address ?? '').toLowerCase(),
    amount: roundCurrency(Number(row.amount ?? 0)),
    currency: String(row.currency ?? 'USD').toUpperCase(),
    category: String(row.category ?? 'other').toLowerCase(),
    description: row.description ? String(row.description) : '',
    receiptImageUrl: row.receipt_image_url ? String(row.receipt_image_url) : null,
    expenseDate,
    createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now(),
  };
}

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';

  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }

  return address;
}

async function getHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const categoryFilter = (searchParams.get('category') || '').trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
  const offset = (page - 1) * limit;

  try {
    const expenseParams: Array<string | number> = [authAddress];
    let expenseFilterSql = '';

    if (categoryFilter && categoryFilter !== 'all') {
      expenseParams.push(categoryFilter);
      expenseFilterSql = ` AND LOWER(category) = $${expenseParams.length}`;
    }

    expenseParams.push(limit, offset);

    const [expensesResult, categoryTotalsResult, revenueSummaryResult, revenueSeriesResult] = await Promise.all([
      query(
        `SELECT id, merchant_address, amount, currency, category, description,
                receipt_image_url, expense_date, created_at, updated_at
           FROM merchant_expenses
          WHERE merchant_address = $1${expenseFilterSql}
          ORDER BY expense_date DESC, created_at DESC
          LIMIT $${expenseParams.length - 1} OFFSET $${expenseParams.length}`,
        expenseParams,
      ),
      query(
        `SELECT LOWER(category) AS category, COALESCE(SUM(amount::numeric), 0) AS total_amount
           FROM merchant_expenses
          WHERE merchant_address = $1
          GROUP BY LOWER(category)
          ORDER BY total_amount DESC, category ASC
          LIMIT 5`,
        [authAddress],
      ),
      query(
        `SELECT COALESCE(SUM(total::numeric), 0) AS revenue,
                COUNT(*) AS order_count
           FROM merchant_orders
          WHERE merchant_address = $1
            AND payment_status = 'paid'
            AND status <> 'cancelled'`,
        [authAddress],
      ),
      query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
                COALESCE(SUM(total::numeric), 0) AS amount
           FROM merchant_orders
          WHERE merchant_address = $1
            AND payment_status = 'paid'
            AND status <> 'cancelled'
            AND created_at >= NOW() - INTERVAL '90 days'
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at) ASC`,
        [authAddress],
      ),
    ]);

    const expenses = expensesResult.rows.map((row) => serializeExpenseRow(row as Record<string, unknown>));
    const topCategories = categoryTotalsResult.rows.map((row) => ({
      category: String(row.category ?? 'other'),
      amount: roundCurrency(Number(row.total_amount ?? 0)),
    }));

    const revenue = roundCurrency(Number(revenueSummaryResult.rows[0]?.revenue ?? 0));
    const orderCount = Number(revenueSummaryResult.rows[0]?.order_count ?? 0);
    const totalExpenses = roundCurrency(topCategories.reduce((sum, item) => sum + item.amount, 0));
    const netProfit = roundCurrency(revenue - totalExpenses);
    const margin = revenue > 0 ? roundCurrency((netProfit / revenue) * 100) : 0;

    return NextResponse.json({
      success: true,
      expenses,
      summary: {
        revenue,
        expenses: totalExpenses,
        netProfit,
        margin,
        orderCount,
        topCategories,
      },
      revenueSeries: revenueSeriesResult.rows.map((row) => ({
        date: String(row.date ?? ''),
        amount: roundCurrency(Number(row.amount ?? 0)),
      })),
      pagination: {
        page,
        limit,
        total: expenses.length,
        pages: expenses.length < limit ? page : page + 1,
      },
    });
  } catch (error) {
    logger.error('[Merchant Expenses GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses and profit summary' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = createExpenseSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid expense payload' }, { status: 400 });
    }

    const body = parsedBody.data;
    const result = await query(
      `INSERT INTO merchant_expenses (
         merchant_address,
         amount,
         currency,
         category,
         description,
         receipt_image_url,
         expense_date,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), NOW())
       RETURNING id, merchant_address, amount, currency, category, description,
                 receipt_image_url, expense_date, created_at, updated_at`,
      [
        authAddress,
        roundCurrency(body.amount),
        body.currency.toUpperCase(),
        body.category.trim().toLowerCase(),
        body.description ?? '',
        body.receiptImageUrl || null,
        body.expenseDate ?? null,
      ],
    );

    return NextResponse.json({
      success: true,
      expense: serializeExpenseRow(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Expenses POST] Error:', error);
    return NextResponse.json({ error: 'Failed to add expense' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = updateExpenseSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid expense update payload' }, { status: 400 });
    }

    const { id, amount, currency, category, description, receiptImageUrl, expenseDate } = parsedBody.data;
    const fields: string[] = [];
    const values: Array<string | number | null> = [id, authAddress];
    let parameterIndex = 3;

    if (amount !== undefined) {
      fields.push(`amount = $${parameterIndex++}`);
      values.push(roundCurrency(amount));
    }
    if (currency !== undefined) {
      fields.push(`currency = $${parameterIndex++}`);
      values.push(currency.toUpperCase());
    }
    if (category !== undefined) {
      fields.push(`category = $${parameterIndex++}`);
      values.push(category.trim().toLowerCase());
    }
    if (description !== undefined) {
      fields.push(`description = $${parameterIndex++}`);
      values.push(description);
    }
    if (receiptImageUrl !== undefined) {
      fields.push(`receipt_image_url = $${parameterIndex++}`);
      values.push(receiptImageUrl || null);
    }
    if (expenseDate !== undefined) {
      fields.push(`expense_date = $${parameterIndex++}::date`);
      values.push(expenseDate);
    }

    fields.push('updated_at = NOW()');

    const result = await query(
      `UPDATE merchant_expenses
          SET ${fields.join(', ')}
        WHERE id = $1 AND merchant_address = $2
        RETURNING id, merchant_address, amount, currency, category, description,
                  receipt_image_url, expense_date, created_at, updated_at`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      expense: serializeExpenseRow(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Expenses PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(new URL(request.url).searchParams.get('id') || '0');
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Expense id required' }, { status: 400 });
  }

  try {
    const result = await query(
      'DELETE FROM merchant_expenses WHERE id = $1 AND merchant_address = $2 RETURNING id',
      [id, authAddress],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Merchant Expenses DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
