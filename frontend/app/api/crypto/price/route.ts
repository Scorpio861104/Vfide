import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// VFIDE Token address on Base Sepolia (from deployment)
// Note: Update with actual deployed address when token is deployed on mainnet
const VFIDE_TOKEN_ADDRESS = process.env.VFIDE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'; // Base WETH

// Uniswap V3 Pool interface
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
      { name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Create public client for Base Sepolia
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
});

/**
 * Calculate price from Uniswap V3 sqrtPriceX96
 */
function calculatePrice(sqrtPriceX96: bigint, token0: string, token1: string, decimals0: number, decimals1: number): number {
  const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
  const price = sqrtPrice ** 2;
  
  // Adjust for decimals
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  let adjustedPrice = price * decimalAdjustment;
  
  // If VFIDE is token1, invert the price
  if (token0.toLowerCase() === VFIDE_TOKEN_ADDRESS.toLowerCase()) {
    adjustedPrice = 1 / adjustedPrice;
  }
  
  return adjustedPrice;
}

/**
 * GET /api/crypto/price
 * Fetch live VFIDE price from Uniswap V3 pool + ETH price from CoinGecko
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Fetch ETH price from CoinGecko
    const ethPriceResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    
    const ethPriceData = await ethPriceResponse.json();
    const ethPrice = ethPriceData.ethereum?.usd || 2000;

    // NOTE: Once VFIDE/WETH pool is deployed on Uniswap, enable live price fetching below
    // Current pricing uses calculated price based on tokenomics:
    // Total Supply: 200M VFIDE
    // Initial Market Cap Target: $20M
    // Initial Price: $20M / 200M = $0.10 per VFIDE
    
    const vfidePrice = 0.10; // Base price in USD
    
    // Calculate VFIDE price in ETH
    const vfidePriceInEth = vfidePrice / ethPrice;

    // FUTURE: Enable once Uniswap pool is deployed
    /*
    try {
      const poolAddress = '0x...'; // VFIDE/WETH pool address
      
      const [slot0Data, token0, token1] = await Promise.all([
        client.readContract({
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'slot0',
        }),
        client.readContract({
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'token0',
        }),
        client.readContract({
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'token1',
        }),
      ]);

      const sqrtPriceX96 = slot0Data[0];
      const liveVfidePriceInEth = calculatePrice(
        sqrtPriceX96,
        token0,
        token1,
        18, // VFIDE decimals
        18  // WETH decimals
      );
      
      vfidePriceInEth = liveVfidePriceInEth;
      vfidePrice = liveVfidePriceInEth * ethPrice;
    } catch (poolError) {
      console.warn('[Price API] Pool not deployed yet, using base price');
    }
    */

    // Market data
    const marketCap = 200_000_000 * vfidePrice; // Total supply * price
    const circulatingSupply = 50_000_000; // Presale allocation initially circulating
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
      source: 'calculated', // Will be 'uniswap' once pool is deployed
    });
  } catch (error) {
    console.error('[Price API] Error:', error);
    
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
