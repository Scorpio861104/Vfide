/**
 * Network Latency Monitoring
 * 
 * Phase 3: Monitor RPC endpoint latency and health
 */

export type LatencyStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface LatencyData {
  chainId: number;
  latency: number; // in milliseconds
  status: LatencyStatus;
  timestamp: number;
  endpoint: string;
}

const latencyCache = new Map<number, LatencyData>();

/**
 * Get latency status based on response time
 */
export function getLatencyStatus(latencyMs: number): LatencyStatus {
  if (latencyMs < 0) return 'offline';
  if (latencyMs < 100) return 'excellent';
  if (latencyMs < 300) return 'good';
  if (latencyMs < 800) return 'fair';
  return 'poor';
}

/**
 * Get color for latency status
 */
export function getLatencyColor(status: LatencyStatus): string {
  switch (status) {
    case 'excellent':
      return '#50C878'; // Green
    case 'good':
      return '#9ACD32'; // Yellow-green
    case 'fair':
      return '#FFA500'; // Orange
    case 'poor':
      return '#FF6347'; // Red-orange
    case 'offline':
      return '#8B0000'; // Dark red
  }
}

/**
 * Measure RPC endpoint latency
 */
export async function measureLatency(
  endpoint: string,
  chainId: number
): Promise<LatencyData> {
  const startTime = performance.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const latency = performance.now() - startTime;
    const status = response.ok ? getLatencyStatus(latency) : 'poor';
    
    const data: LatencyData = {
      chainId,
      latency: Math.round(latency),
      status,
      timestamp: Date.now(),
      endpoint,
    };
    
    latencyCache.set(chainId, data);
    return data;
  } catch (error) {
    const data: LatencyData = {
      chainId,
      latency: -1,
      status: 'offline',
      timestamp: Date.now(),
      endpoint,
    };
    
    latencyCache.set(chainId, data);
    return data;
  }
}

/**
 * Get cached latency data
 */
export function getCachedLatency(chainId: number): LatencyData | null {
  const cached = latencyCache.get(chainId);
  
  // Return null if cache is older than 30 seconds
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached;
  }
  
  return null;
}

/**
 * Clear latency cache
 */
export function clearLatencyCache(): void {
  latencyCache.clear();
}
