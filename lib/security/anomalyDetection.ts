/**
 * Anomaly Detection System for Token Security
 * 
 * Monitors token usage patterns to detect potential security threats:
 * - Multiple locations
 * - Unusual access patterns
 * - Rapid token switches
 * - Suspicious device changes
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import { getRequestIp } from '@/lib/security/requestContext';

// Initialize Redis client
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  logger.error('[Anomaly Detection] Failed to initialize Redis:', error);
}

// In-memory fallback for development
const memoryStore = new Map<string, TokenActivity[]>();

// Activity tracking types
export interface TokenActivity {
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  location?: string;
  action: 'login' | 'api_call' | 'logout' | 'refresh';
  endpoint?: string;
}

export interface AnomalyAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'location_change' | 'device_change' | 'rapid_requests' | 'suspicious_pattern';
  message: string;
  timestamp: number;
  userAddress: string;
  currentActivity: TokenActivity;
  suspiciousActivities: TokenActivity[];
}

// Configuration
const ACTIVITY_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_ACTIVITIES_PER_WINDOW = 100;
const ALERT_THRESHOLD = {
  location_change: 2, // Different locations within window
  device_change: 3, // Different user agents
  rapid_requests: 50, // Requests per minute
};

/**
 * Record token activity
 */
export async function recordActivity(
  userAddress: string,
  activity: TokenActivity
): Promise<void> {
  const key = `activity:${userAddress.toLowerCase()}`;
  
  if (redis) {
    try {
      // Get recent activities
      const recentStr = await redis.get(key);
      const recent: TokenActivity[] = recentStr ? JSON.parse(recentStr as string) : [];
      
      // Add new activity
      recent.push(activity);
      
      // Remove old activities outside window
      const cutoff = Date.now() - ACTIVITY_WINDOW;
      const filtered = recent.filter(a => a.timestamp > cutoff);
      
      // Limit array size
      const limited = filtered.slice(-MAX_ACTIVITIES_PER_WINDOW);
      
      // Store back
      await redis.setex(key, 3600, JSON.stringify(limited));
    } catch (error) {
      logger.error('[Anomaly Detection] Redis error:', error);
      // Fallback to memory
      recordActivityMemory(userAddress, activity);
    }
  } else {
    recordActivityMemory(userAddress, activity);
  }
}

/**
 * Memory fallback for activity recording
 */
function recordActivityMemory(userAddress: string, activity: TokenActivity): void {
  const key = userAddress.toLowerCase();
  const recent = memoryStore.get(key) || [];
  
  recent.push(activity);
  
  // Remove old activities
  const cutoff = Date.now() - ACTIVITY_WINDOW;
  const filtered = recent.filter(a => a.timestamp > cutoff);
  
  memoryStore.set(key, filtered.slice(-MAX_ACTIVITIES_PER_WINDOW));
}

/**
 * Analyze activities for anomalies
 */
export async function analyzeActivity(
  userAddress: string,
  currentActivity: TokenActivity
): Promise<AnomalyAlert | null> {
  const activities = await getRecentActivities(userAddress);
  
  if (activities.length < 2) {
    return null; // Not enough data to analyze
  }

  // Check for location changes
  const locationAlert = checkLocationAnomaly(activities, currentActivity, userAddress);
  if (locationAlert) return locationAlert;

  // Check for device changes
  const deviceAlert = checkDeviceAnomaly(activities, currentActivity, userAddress);
  if (deviceAlert) return deviceAlert;

  // Check for rapid requests
  const rapidAlert = checkRapidRequests(activities, currentActivity, userAddress);
  if (rapidAlert) return rapidAlert;

  return null;
}

/**
 * Get recent activities for a user
 */
async function getRecentActivities(userAddress: string): Promise<TokenActivity[]> {
  const key = `activity:${userAddress.toLowerCase()}`;
  
  if (redis) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data as string) : [];
    } catch (error) {
      logger.error('[Anomaly Detection] Error fetching activities:', error);
    }
  }
  
  return memoryStore.get(userAddress.toLowerCase()) || [];
}

/**
 * Check for suspicious location changes
 */
function checkLocationAnomaly(
  activities: TokenActivity[],
  current: TokenActivity,
  userAddress: string
): AnomalyAlert | null {
  const uniqueIPs = new Set(activities.map(a => a.ipAddress));
  uniqueIPs.add(current.ipAddress);
  
  if (uniqueIPs.size > ALERT_THRESHOLD.location_change) {
    const suspiciousActivities = activities.filter(
      a => a.ipAddress !== current.ipAddress
    );
    
    return {
      severity: 'high',
      type: 'location_change',
      message: `Access from ${uniqueIPs.size} different IP addresses detected within ${ACTIVITY_WINDOW / 60000} minutes`,
      timestamp: Date.now(),
      userAddress,
      currentActivity: current,
      suspiciousActivities,
    };
  }
  
  return null;
}

/**
 * Check for suspicious device changes
 */
function checkDeviceAnomaly(
  activities: TokenActivity[],
  current: TokenActivity,
  userAddress: string
): AnomalyAlert | null {
  const uniqueDevices = new Set(activities.map(a => a.userAgent));
  uniqueDevices.add(current.userAgent);
  
  if (uniqueDevices.size > ALERT_THRESHOLD.device_change) {
    const suspiciousActivities = activities.filter(
      a => a.userAgent !== current.userAgent
    );
    
    return {
      severity: 'medium',
      type: 'device_change',
      message: `Access from ${uniqueDevices.size} different devices detected`,
      timestamp: Date.now(),
      userAddress,
      currentActivity: current,
      suspiciousActivities,
    };
  }
  
  return null;
}

/**
 * Check for rapid/automated requests
 */
function checkRapidRequests(
  activities: TokenActivity[],
  current: TokenActivity,
  userAddress: string
): AnomalyAlert | null {
  // Count requests in last minute
  const oneMinuteAgo = Date.now() - 60000;
  const recentRequests = activities.filter(a => a.timestamp > oneMinuteAgo);
  
  if (recentRequests.length > ALERT_THRESHOLD.rapid_requests) {
    return {
      severity: 'critical',
      type: 'rapid_requests',
      message: `${recentRequests.length} requests in 1 minute - possible automated attack`,
      timestamp: Date.now(),
      userAddress,
      currentActivity: current,
      suspiciousActivities: recentRequests.slice(-10), // Last 10 requests
    };
  }
  
  return null;
}

/**
 * Get anomaly statistics for a user
 */
export async function getAnomalyStats(userAddress: string): Promise<{
  totalActivities: number;
  uniqueIPs: number;
  uniqueDevices: number;
  requestsLastHour: number;
  lastActivity: TokenActivity | null;
}> {
  const activities = await getRecentActivities(userAddress);
  
  const uniqueIPs = new Set(activities.map(a => a.ipAddress)).size;
  const uniqueDevices = new Set(activities.map(a => a.userAgent)).size;
  const oneHourAgo = Date.now() - ACTIVITY_WINDOW;
  const requestsLastHour = activities.filter(a => a.timestamp > oneHourAgo).length;
  
  return {
    totalActivities: activities.length,
    uniqueIPs,
    uniqueDevices,
    requestsLastHour,
    lastActivity: activities[activities.length - 1] || null,
  };
}

/**
 * Clear activity history for a user (after security action)
 */
export async function clearActivityHistory(userAddress: string): Promise<void> {
  const key = `activity:${userAddress.toLowerCase()}`;
  
  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('[Anomaly Detection] Error clearing history:', error);
    }
  }
  
  memoryStore.delete(userAddress.toLowerCase());
}

/**
 * Extract IP address from request
 */
export function getClientIP(request: Request): string {
  const { ip } = getRequestIp(request.headers);
  return ip;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
