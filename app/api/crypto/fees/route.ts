import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { base, baseSepolia, polygon, polygonAmoy, zkSync, zkSyncSepoliaTestnet } from 'viem/chains';
import { withRateLimit } from '@/lib/auth/rateLimit';

function getConfiguredChain() {
  const chainId = Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '', 10);
  switch (chainId) {
    case base.id:
      return base;
    case baseSepolia.id:
      return baseSepolia;
    case polygon.id:
      return polygon;
    case polygonAmoy.id:
      return polygonAmoy;
    case zkSync.id:
      return zkSync;
    case zkSyncSepoliaTestnet.id:
      return zkSyncSepoliaTestnet;
    default:
      return baseSepolia;
  }
}

const client = createPublicClient({
  chain: getConfiguredChain(),
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

const FALLBACK_GAS_LIMIT = 200000n;
const FALLBACK_GAS_PRICE = 1000000000n;
const FALLBACK_TOTAL_FEE = FALLBACK_GAS_LIMIT * FALLBACK_GAS_PRICE;

async function estimateNetworkFee(): Promise<{ gasLimit: bigint; gasPrice: bigint; totalFee: bigint }> {
  try {
    const gasPrice = await client.getGasPrice();
    if (gasPrice <= 0n) {
      return {
        gasLimit: FALLBACK_GAS_LIMIT,
        gasPrice: FALLBACK_GAS_PRICE,
        totalFee: FALLBACK_TOTAL_FEE,
      };
    }

    const estimatedGas = FALLBACK_GAS_LIMIT;
    const totalFee = gasPrice * estimatedGas;
    
    return { gasLimit: estimatedGas, gasPrice, totalFee };
  } catch (_error) {
    return {
      gasLimit: FALLBACK_GAS_LIMIT,
      gasPrice: FALLBACK_GAS_PRICE,
      totalFee: FALLBACK_TOTAL_FEE,
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
    console.error('[Fee API] Error:', error);
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
