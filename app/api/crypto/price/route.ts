import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia, polygon, polygonAmoy, zkSync, zkSyncSepoliaTestnet } from 'viem/chains';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const VFIDE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;

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

const chain = getConfiguredChain();
const client = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
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

const DEFAULT_ETH_PRICE_USD = 2000;

function parseRefreshParam(refreshParam: string | null): boolean | null {
  if (refreshParam === null) return false;
  const normalized = refreshParam.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

/**
 * Calculate price from Uniswap V3 sqrtPriceX96
 */
function calculatePrice(sqrtPriceX96: bigint, token0: string, decimals0: number, decimals1: number): number {
  if (!VFIDE_TOKEN_ADDRESS) {
    throw new Error('VFIDE token address not configured');
  }

  const sqrtPriceX96Number = Number(sqrtPriceX96);
  if (!Number.isFinite(sqrtPriceX96Number) || sqrtPriceX96Number <= 0) {
    throw new Error('Invalid sqrtPriceX96 value');
  }

  const sqrtPrice = sqrtPriceX96Number / (2 ** 96);
  const price = sqrtPrice ** 2;
  
  // Adjust for decimals
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  let adjustedPrice = price * decimalAdjustment;
  
  // If VFIDE is token0, we get VFIDE per WETH, need to invert
  if (token0.toLowerCase() === VFIDE_TOKEN_ADDRESS.toLowerCase()) {
    adjustedPrice = 1 / adjustedPrice;
  }

  if (!Number.isFinite(adjustedPrice) || adjustedPrice <= 0) {
    throw new Error('Calculated price is invalid');
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

  if (!VFIDE_TOKEN_ADDRESS) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS not configured' }, { status: 500 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const parsedRefresh = parseRefreshParam(searchParams.get('refresh'));
    if (parsedRefresh === null) {
      return NextResponse.json(
        { error: 'Invalid refresh parameter. Must be true or false.' },
        { status: 400 }
      );
    }
    const forceRefresh = parsedRefresh;
    
    // Fetch ETH price from CoinGecko
    const coingeckoUrl = process.env.NEXT_PUBLIC_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3/simple/price';
    const ethPriceResponse = await fetch(
      `${coingeckoUrl}?ids=ethereum&vs_currencies=usd`,
      { next: { revalidate: forceRefresh ? 0 : 60 } } // Cache for 60 seconds unless forced
    );
    
    // Check if fetch was successful
    if (!ethPriceResponse.ok) {
      logger.error('Failed to fetch ETH price:', ethPriceResponse.status);
      // Use fallback price if fetch fails
      const ethPrice = DEFAULT_ETH_PRICE_USD;
      const vfidePrice = 0.10;
      const vfidePriceInEth = vfidePrice / ethPrice;
      
      return NextResponse.json({ 
        price: vfidePriceInEth, 
        priceUsd: vfidePrice, 
        ethPrice,
        source: 'fallback'
      });
    }
    
    const ethPriceData = await ethPriceResponse.json();
    const rawEthPrice = ethPriceData?.ethereum?.usd;
    const parsedEthPrice = typeof rawEthPrice === 'number' ? rawEthPrice : Number(rawEthPrice);
    const ethPrice = Number.isFinite(parsedEthPrice) && parsedEthPrice > 0
      ? parsedEthPrice
      : DEFAULT_ETH_PRICE_USD;

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
      } catch (error) {
        logger.debug('[Price API] Pool read failed, falling back to tokenomics price', error);
        // Pool read failed, continue with tokenomics price
        logger.warn('[Price API] Pool read failed, using tokenomics price');
      }
    }

    // Market data
    const marketCap = 200_000_000 * vfidePrice; // Total supply * price
    const circulatingSupply = 50_000_000; // Initial circulating supply
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
  } catch (error) {
    logger.error('[Price API] Error:', error);
    
    // Fallback to base prices
    return NextResponse.json({
      success: true,
      prices: {
        vfide: {
          usd: 0.10,
          eth: 0.00005,
        },
        eth: {
          usd: 2000,
        },
      },
      market: {
        marketCap: 20_000_000,
        circulatingMarketCap: 5_000_000,
        totalSupply: 200_000_000,
        circulatingSupply: 50_000_000,
      },
      timestamp: Date.now(),
      source: 'fallback',
    });
  }
}
