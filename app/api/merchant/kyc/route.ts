import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validateAddress, validateStringLength, createErrorResponse } from '@/lib/inputValidation';

/**
 * POST /api/merchant/kyc
 * Submit KYC documents for verification
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 3 requests per hour
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 3, windowMs: 3600000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many KYC submissions. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const client = await getClient();
  
  try {
    const body = await request.json();
    const { 
      userAddress,
      documentType,
      documentNumber,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
      additionalInfo
    } = body;

    // Validate inputs
    const validatedAddress = validateAddress(userAddress);
    const validatedDocType = validateStringLength(documentType, 'Document type', 3, 50);
    const validatedDocNumber = validateStringLength(documentNumber, 'Document number', 5, 50);
    const validatedFrontUrl = validateStringLength(documentFrontUrl, 'Document front URL', 10, 500);
    const validatedSelfieUrl = validateStringLength(selfieUrl, 'Selfie URL', 10, 500);

    if (!['passport', 'drivers_license', 'national_id'].includes(documentType)) {
      return NextResponse.json(
        createErrorResponse('Document type must be: passport, drivers_license, or national_id'),
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get merchant ID
    const merchantResult = await client.query(
      `SELECT m.id, m.status 
       FROM merchants m
       JOIN users u ON m.user_id = u.id
       WHERE u.wallet_address = $1`,
      [validatedAddress]
    );

    if (merchantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        createErrorResponse('Merchant not found. Please register first.'),
        { status: 404 }
      );
    }

    const merchant = merchantResult.rows[0];

    if (merchant.status === 'approved') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        createErrorResponse('Merchant already approved. KYC not needed.'),
        { status: 400 }
      );
    }

    // Check if KYC already submitted
    const existingKyc = await client.query(
      'SELECT id, status FROM merchant_kyc WHERE merchant_id = $1',
      [merchant.id]
    );

    if (existingKyc.rows.length > 0 && existingKyc.rows[0].status === 'pending') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        createErrorResponse('KYC already submitted and pending review.'),
        { status: 400 }
      );
    }

    // Create or update KYC record
    const kycResult = await client.query(
      `INSERT INTO merchant_kyc (
        merchant_id,
        document_type,
        document_number,
        document_front_url,
        document_back_url,
        selfie_url,
        additional_info,
        status,
        submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
      ON CONFLICT (merchant_id) 
      DO UPDATE SET
        document_type = EXCLUDED.document_type,
        document_number = EXCLUDED.document_number,
        document_front_url = EXCLUDED.document_front_url,
        document_back_url = EXCLUDED.document_back_url,
        selfie_url = EXCLUDED.selfie_url,
        additional_info = EXCLUDED.additional_info,
        status = 'pending',
        submitted_at = NOW()
      RETURNING *`,
      [
        merchant.id,
        validatedDocType,
        validatedDocNumber,
        validatedFrontUrl,
        documentBackUrl || null,
        validatedSelfieUrl,
        additionalInfo || null
      ]
    );

    // Update merchant status
    await client.query(
      `UPDATE merchants SET status = 'kyc_submitted', updated_at = NOW() WHERE id = $1`,
      [merchant.id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      kyc: kycResult.rows[0],
      message: 'KYC documents submitted successfully. Review typically takes 2-3 business days.',
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Merchant KYC API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/merchant/kyc?userAddress=0x...
 * Get KYC verification status
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
        `SELECT k.id, k.status, k.submitted_at, k.verified_at, k.rejection_reason
         FROM merchant_kyc k
         JOIN merchants m ON k.merchant_id = m.id
         JOIN users u ON m.user_id = u.id
         WHERE u.wallet_address = $1`,
        [validatedAddress]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({
          submitted: false,
          kyc: null,
        });
      }

      return NextResponse.json({
        submitted: true,
        kyc: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Merchant KYC GET API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  }
}
