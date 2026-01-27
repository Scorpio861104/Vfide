import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { withRateLimit } from '@/lib/auth/rateLimit';

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

function _calculateTotalAmount(
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
  // Rate limiting: 100 requests per minute for fee calculations
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const networkFee = await estimateNetworkFee();
    const gasPrice = networkFee.gasPrice;
    const baseFee = gasPrice;
    
    // Calculate priority fees for different tiers
    const slowPriority = baseFee / 10n; // 10% of base
    const standardPriority = baseFee / 5n; // 20% of base
    const fastPriority = baseFee / 2n; // 50% of base
    
    return NextResponse.json({
      success: true,
      fees: {
        slow: {
          maxFeePerGas: (baseFee + slowPriority).toString(),
          maxPriorityFeePerGas: slowPriority.toString(),
        },
        standard: {
          maxFeePerGas: (baseFee + standardPriority).toString(),
          maxPriorityFeePerGas: standardPriority.toString(),
        },
        fast: {
          maxFeePerGas: (baseFee + fastPriority).toString(),
          maxPriorityFeePerGas: fastPriority.toString(),
        },
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    log.error('[Fee API] Error:', error);
    return NextResponse.json({
      success: true,
      fees: {
        slow: {
          maxFeePerGas: '1000000000',
          maxPriorityFeePerGas: '100000000',
        },
        standard: {
          maxFeePerGas: '1500000000',
          maxPriorityFeePerGas: '200000000',
        },
        fast: {
          maxFeePerGas: '2000000000',
          maxPriorityFeePerGas: '500000000',
        },
      },
      timestamp: Date.now(),
    }, { status: 200 });
  }
}
