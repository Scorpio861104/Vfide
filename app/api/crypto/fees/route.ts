import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import { validateQueryParams } from '@/lib/api-validation';
import { apiLogger } from '@/lib/logger.service';
import { schemas } from '@/lib/api-validation';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
});

async function estimateNetworkFee(): Promise<{ gasLimit: bigint; gasPrice: bigint; totalFee: bigint }> {
  try {
    const gasPrice = await client.getGasPrice();
    const estimatedGas = 200000n;
    const totalFee = gasPrice * estimatedGas;
    
    return { gasLimit: estimatedGas, gasPrice, totalFee };
  } catch (_error) {
    return {
      gasLimit: 200000n,
      gasPrice: 1000000000n,
      totalFee: 200000000000000n,
    };
  }
}

interface FeeCalculation {
  requestedAmount: string;
  burnFee: string;
  networkFeeInVfide: string;
  totalAmount: string;
  breakdown: {
    burn: string;
    sanctum: string;
    ecosystem: string;
  };
}

function calculateTotalAmount(
  amount: string,
  burnFeeBps: number,
  networkFeeInEth: string,
  vfidePriceInEth: number
): FeeCalculation {
  const requestedAmountBigInt = parseEther(amount);
  const burnFeeBigInt = (requestedAmountBigInt * BigInt(burnFeeBps)) / 10000n;
  const networkFeeEthBigInt = parseEther(networkFeeInEth);
  const networkFeeVfideBigInt = (networkFeeEthBigInt * parseEther('1')) / parseEther(vfidePriceInEth.toString());
  const totalAmountBigInt = requestedAmountBigInt + burnFeeBigInt + networkFeeVfideBigInt;
  
  const burnPortion = (burnFeeBigInt * 200n) / 320n;
  const sanctumPortion = (burnFeeBigInt * 100n) / 320n;
  const ecosystemPortion = (burnFeeBigInt * 20n) / 320n;
  
  return {
    requestedAmount: formatEther(requestedAmountBigInt),
    burnFee: formatEther(burnFeeBigInt),
    networkFeeInVfide: formatEther(networkFeeVfideBigInt),
    totalAmount: formatEther(totalAmountBigInt),
    breakdown: {
      burn: formatEther(burnPortion),
      sanctum: formatEther(sanctumPortion),
      ecosystem: formatEther(ecosystemPortion),
    },
  };
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`fees:${clientId}`, { windowMs: 60000, maxRequests: 60 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Validate required parameters
    const amountValidation = validateQueryParams(searchParams, {
      amount: { required: true, type: 'string' },
      from: { required: true, type: 'address' }
    });
    if (!amountValidation.valid) {
      return amountValidation.errorResponse;
    }

    const amount = searchParams.get('amount')!;
    const fromAddress = searchParams.get('from')!;
    
    const priceResponse = await fetch(
      `${request.nextUrl.origin}/api/crypto/price`,
      { next: { revalidate: 60 } }
    );
    const priceData = await priceResponse.json();
    const vfidePriceInEth = priceData.prices.vfide.eth;
    const vfidePriceInUsd = priceData.prices.vfide.usd;
    
    const networkFee = await estimateNetworkFee();
    const networkFeeInEth = formatEther(networkFee.totalFee);
    const networkFeeInUsd = parseFloat(networkFeeInEth) * priceData.prices.eth.usd;
    
    const burnFees = {
      burnBps: 200,
      sanctumBps: 100,
      ecosystemBps: 20,
      totalBps: 320,
    };
    
    const calculation = calculateTotalAmount(
      amount,
      burnFees.totalBps,
      networkFeeInEth,
      vfidePriceInEth
    );
    
    return NextResponse.json({
      success: true,
      fees: {
        network: {
          eth: networkFeeInEth,
          usd: networkFeeInUsd,
          vfide: calculation.networkFeeInVfide,
          gasLimit: networkFee.gasLimit.toString(),
          gasPrice: networkFee.gasPrice.toString(),
        },
        burn: {
          vfide: calculation.burnFee,
          usd: parseFloat(calculation.burnFee) * vfidePriceInUsd,
          bps: burnFees.totalBps,
          breakdown: {
            burn: {
              vfide: calculation.breakdown.burn,
              bps: burnFees.burnBps,
              usd: parseFloat(calculation.breakdown.burn) * vfidePriceInUsd,
            },
            sanctum: {
              vfide: calculation.breakdown.sanctum,
              bps: burnFees.sanctumBps,
              usd: parseFloat(calculation.breakdown.sanctum) * vfidePriceInUsd,
            },
            ecosystem: {
              vfide: calculation.breakdown.ecosystem,
              bps: burnFees.ecosystemBps,
              usd: parseFloat(calculation.breakdown.ecosystem) * vfidePriceInUsd,
            },
          },
        },
        total: {
          vfide: calculation.totalAmount,
          usd: parseFloat(calculation.totalAmount) * vfidePriceInUsd,
        },
      },
      calculation: {
        requested: calculation.requestedAmount,
        burnFee: calculation.burnFee,
        networkFee: calculation.networkFeeInVfide,
        total: calculation.totalAmount,
      },
      note: 'Burn fee varies based on ProofScore (higher score = lower fees)',
    });
  } catch (error) {
    apiLogger.error('Fee API error', { error });
    return NextResponse.json({ error: 'Failed to calculate fees' }, { status: 500 });
  }
}
