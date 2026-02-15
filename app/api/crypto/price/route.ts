import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { withRateLimit } from '@/lib/auth/rateLimit';

// VFIDE Token address - from environment or deployment
const VFIDE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';

// Create public client for Base Sepolia
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
});

// Uniswap V3 Pool ABI (minimal for price reading)
const POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Calculate price from Uniswap V3 sqrtPriceX96
 */
function calculatePrice(sqrtPriceX96: bigint, token0: string, decimals0: number, decimals1: number): number {
  // Use BigInt arithmetic to avoid precision loss on uint160 values (up to 2^160)
  // Number can only represent integers up to 2^53 safely
  const sqrtPriceBig = BigInt(sqrtPriceX96);
  const Q96 = BigInt(2) ** BigInt(96);
  // price = (sqrtPrice / 2^96)^2 = sqrtPrice^2 / 2^192
  // Scale by 1e18 for precision
  const priceScaled = (sqrtPriceBig * sqrtPriceBig * BigInt(1e18)) / (Q96 * Q96);
  const price = Number(priceScaled) / 1e18;

  // Adjust for decimals
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  let adjustedPrice = price * decimalAdjustment;
  
  // If VFIDE is token0, we get VFIDE per WETH, need to invert
  if (token0.toLowerCase() === VFIDE_TOKEN_ADDRESS.toLowerCase()) {
    adjustedPrice = 1 / adjustedPrice;
  }
  
  return adjustedPrice;
}

// Pool address from environment (deployed Uniswap V3 pool)
const VFIDE_WETH_POOL = process.env.NEXT_PUBLIC_VFIDE_WETH_POOL_ADDRESS;

/**
 * GET /api/crypto/price
 * Fetch live VFIDE price from Uniswap V3 pool + ETH price from CoinGecko
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Fetch ETH price from CoinGecko
    const coingeckoUrl = process.env.NEXT_PUBLIC_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3/simple/price';
    const ethPriceResponse = await fetch(
      `${coingeckoUrl}?ids=ethereum&vs_currencies=usd`,
      { next: { revalidate: forceRefresh ? 0 : 60 } } // Cache for 60 seconds unless forced
    );
    
    // Check if fetch was successful
    if (!ethPriceResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'ETH price feed unavailable',
        source: 'unavailable',
        timestamp: Date.now(),
      }, { status: 503 });
    }
    
    const ethPriceData = await ethPriceResponse.json();
    const ethPrice = ethPriceData.ethereum?.usd || 2000;

    // Default to tokenomics-based price
    let vfidePrice = 0.10; // Base price in USD
    let vfidePriceInEth = vfidePrice / ethPrice;
    let priceSource: 'uniswap' | 'tokenomics' | 'fallback' = 'tokenomics';

    // Try to fetch live price from Uniswap if pool is deployed
    if (VFIDE_WETH_POOL && VFIDE_WETH_POOL !== '0x0000000000000000000000000000000000000000') {
      try {
        const [slot0Data, token0] = await Promise.all([
          client.readContract({
            address: VFIDE_WETH_POOL as `0x${string}`,
            abi: POOL_ABI,
            functionName: 'slot0',
          }),
          client.readContract({
            address: VFIDE_WETH_POOL as `0x${string}`,
            abi: POOL_ABI,
            functionName: 'token0',
          }),
        ]);

        const sqrtPriceX96 = slot0Data[0];
        const liveVfidePriceInEth = calculatePrice(
          sqrtPriceX96,
          token0,
          18, // VFIDE decimals
          18  // WETH decimals
        );
        
        vfidePriceInEth = liveVfidePriceInEth;
        vfidePrice = liveVfidePriceInEth * ethPrice;
        priceSource = 'uniswap';
      } catch {
        // Pool read failed, continue with tokenomics price
        console.warn('[Price API] Pool read failed, using tokenomics price');
      }
    }

    // Market data
    const marketCap = 200_000_000 * vfidePrice; // Total supply * price
    const circulatingSupply = 50_000_000; // Launch allocation initially circulating
    const circulatingMarketCap = circulatingSupply * vfidePrice;

    return NextResponse.json({
      success: true,
      prices: {
        vfide: {
          usd: vfidePrice,
          eth: vfidePriceInEth,
        },
        eth: {
          usd: ethPrice,
        },
      },
      market: {
        marketCap,
        circulatingMarketCap,
        totalSupply: 200_000_000,
        circulatingSupply,
      },
      timestamp: Date.now(),
      source: priceSource,
    });
  } catch (_error) {
    return NextResponse.json({
      success: false,
      error: 'Price service temporarily unavailable',
      timestamp: Date.now(),
    }, { status: 503 });
  }
}
