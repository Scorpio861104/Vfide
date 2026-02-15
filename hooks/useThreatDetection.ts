import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';
import {
  ThreatDetectionResult,
  ThreatAlert,
  ThreatLevel,
  ThreatType,
  SecurityMetrics,
  getThreatLevel,
  calculateRiskScore,
  DEFAULT_RATE_LIMITS
} from '@/config/security-advanced';

export interface UseThreatDetectionResult {
  threatLevel: ThreatLevel;
  riskScore: number;
  threats: ThreatAlert[];
  activeThreats: ThreatAlert[];
  metrics: SecurityMetrics;
  
  // Detection methods
  detectAnomalies: () => Promise<ThreatDetectionResult>;
  checkRateLimit: (action: string) => boolean;
  reportSuspiciousActivity: (type: ThreatType, details: Record<string, unknown>) => void;
  
  // Management
  resolveThread: (threatId: string) => void;
  dismissThreat: (threatId: string) => void;
  getRecommendations: () => string[];
}

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
  blockUntil?: number;
}

const generateThreatId = (): string => {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `threat_${Date.now()}_${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
};

const apiRateLimit = DEFAULT_RATE_LIMITS.api ?? { maxAttempts: 100, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 };

type AnomalyStats = {
  totalActivities: number;
  uniqueIPs: number;
  uniqueDevices: number;
  requestsLastHour: number;
  lastActivity: { timestamp: number; ipAddress: string; userAgent: string } | null;
};

const buildThreatsFromStats = (stats: AnomalyStats | null): ThreatAlert[] => {
  if (!stats) return [];
  const threats: ThreatAlert[] = [];

  if (stats.uniqueIPs > 1) {
    threats.push({
      id: generateThreatId(),
      type: 'unusual_location',
      severity: 'medium',
      detected: new Date(),
      message: 'Multiple access locations detected',
      details: { uniqueIPs: stats.uniqueIPs },
      resolved: false,
    });
  }

  if (stats.uniqueDevices > 1) {
    threats.push({
      id: generateThreatId(),
      type: 'unusual_device',
      severity: 'medium',
      detected: new Date(),
      message: 'Multiple devices detected',
      details: { uniqueDevices: stats.uniqueDevices },
      resolved: false,
    });
  }

  if (stats.requestsLastHour >= apiRateLimit.maxAttempts) {
    threats.push({
      id: generateThreatId(),
      type: 'rapid_requests',
      severity: 'high',
      detected: new Date(),
      message: 'High request volume detected',
      details: { requestsLastHour: stats.requestsLastHour },
      resolved: false,
    });
  }

  return threats;
};

export const useThreatDetection = (): UseThreatDetectionResult => {
  const { address } = useAccount();
  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [riskScore, setRiskScore] = useState<number>(0);
  const [rateLimits, setRateLimits] = useState<Map<string, RateLimitEntry>>(new Map());
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats | null>(null);

  const fetchAnomalyStats = useCallback(async (): Promise<AnomalyStats | null> => {
    try {
      const response = await fetch('/api/security/anomaly');
      if (!response.ok) throw new Error('Failed to fetch anomaly stats');
      const data = await response.json();
      const stats = data.stats as AnomalyStats | undefined;
      if (!stats) return null;

      setAnomalyStats(stats);
      const nextThreats = buildThreatsFromStats(stats);
      setThreats(nextThreats);

      const score = calculateRiskScore({
        failedAttempts: nextThreats.filter(t => t.type === 'brute_force').length,
        unusualLocation: stats.uniqueIPs > 1,
        unusualDevice: stats.uniqueDevices > 1,
        rapidRequests: stats.requestsLastHour >= apiRateLimit.maxAttempts,
        suspiciousIp: false,
        noTwoFactor: false
      });
      setRiskScore(score);
      return stats;
    } catch (error) {
      console.error('Failed to fetch anomaly stats', error);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchAnomalyStats();
  }, [fetchAnomalyStats]);

  useEffect(() => {
    // Calculate risk score based on active threats
    const activeThreats = threats.filter(t => !t.resolved);
    const score = calculateRiskScore({
      failedAttempts: activeThreats.filter(t => t.type === 'brute_force').length,
      unusualLocation: activeThreats.some(t => t.type === 'unusual_location'),
      unusualDevice: activeThreats.some(t => t.type === 'unusual_device'),
      rapidRequests: activeThreats.some(t => t.type === 'rapid_requests'),
      suspiciousIp: activeThreats.some(t => t.type === 'suspicious_ip'),
      noTwoFactor: false // Check from 2FA hook
    });
    setRiskScore(score);
  }, [threats]);

  const addThreat = useCallback((
    type: ThreatType,
    severity: ThreatLevel,
    message: string,
    details: Record<string, unknown> = {}
  ) => {
    const newThreat: ThreatAlert = {
      id: generateThreatId(),
      type,
      severity,
      detected: new Date(),
      message,
      details,
      resolved: false
    };

    setThreats(prev => {
      const updated = [...prev, newThreat];
      return updated;
    });
  }, []);

  const detectAnomalies = useCallback(async (): Promise<ThreatDetectionResult> => {
    const stats = await fetchAnomalyStats();
    const detectedThreats = buildThreatsFromStats(stats);

    const score = calculateRiskScore({
      failedAttempts: detectedThreats.filter(t => t.type === 'brute_force').length,
      unusualLocation: detectedThreats.some(t => t.type === 'unusual_location'),
      unusualDevice: detectedThreats.some(t => t.type === 'unusual_device'),
      rapidRequests: detectedThreats.some(t => t.type === 'rapid_requests'),
      suspiciousIp: detectedThreats.some(t => t.type === 'suspicious_ip'),
      noTwoFactor: false
    });

    const recommendations: string[] = [];
    if (detectedThreats.some(t => t.type === 'unusual_location' || t.type === 'unusual_device')) {
      recommendations.push('Enable two-factor authentication for additional security');
    }

    return {
      threatLevel: getThreatLevel(score),
      riskScore: score,
      threats: detectedThreats,
      recommendations,
    };
  }, [fetchAnomalyStats]);

  const checkRateLimit = useCallback((action: string): boolean => {
    const config = DEFAULT_RATE_LIMITS[action] ?? apiRateLimit;
    const now = Date.now();
    const key = action;
    
    const entry = rateLimits.get(key);

    if (!entry) {
      setRateLimits(prev => new Map(prev).set(key, {
        count: 1,
        firstAttempt: now,
        blocked: false
      }));
      return true; // Allow
    }

    // Check if still blocked
    if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
      return false; // Blocked
    }

    // Check if window expired
    if (now - entry.firstAttempt > (config?.windowMs ?? 60000)) {
      setRateLimits(prev => new Map(prev).set(key, {
        count: 1,
        firstAttempt: now,
        blocked: false
      }));
      return true; // Allow
    }

    // Increment count
    const newCount = entry.count + 1;

    if (newCount > (config?.maxAttempts ?? 10)) {
      // Block and report threat
      setRateLimits(prev => new Map(prev).set(key, {
        ...entry,
        count: newCount,
        blocked: true,
        blockUntil: now + (config?.blockDurationMs ?? 300000)
      }));

      addThreat(
        'rapid_requests',
        'high',
        `Rate limit exceeded for ${action}`,
        { action, attempts: newCount }
      );

      return false; // Blocked
    }

    setRateLimits(prev => new Map(prev).set(key, {
      ...entry,
      count: newCount
    }));

    return true; // Allow
  }, [rateLimits, addThreat]);

  const reportSuspiciousActivity = useCallback((
    type: ThreatType,
    details: Record<string, unknown>
  ) => {
    const severityMap: Record<ThreatType, ThreatLevel> = {
      brute_force: 'high',
      unusual_location: 'medium',
      unusual_device: 'medium',
      rapid_requests: 'high',
      suspicious_ip: 'high',
      compromised_credentials: 'critical',
      session_hijacking: 'critical',
      unknown: 'low'
    };

    addThreat(
      type,
      severityMap[type],
      `Suspicious activity detected: ${type}`,
      details
    );
    if (!address) return;

    const reporter = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;
    if (!reporter) return;

    void buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST')
      .then((headers) =>
        reporter('/api/security/violations', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            userAddress: address,
            violationType: type,
            severity: severityMap[type],
            description: details?.message ?? `Suspicious activity detected: ${type}`,
            ipAddress: details?.ipAddress,
            details,
          }),
        })
      )
      .catch((error) => {
        console.error('Failed to report suspicious activity', error);
      });
  }, [addThreat, address]);

  const resolveThread = useCallback((threatId: string) => {
    setThreats(prev => {
      const updated = prev.map(t =>
        t.id === threatId ? { ...t, resolved: true } : t
      );
      return updated;
    });
  }, []);

  const dismissThreat = useCallback((threatId: string) => {
    setThreats(prev => {
      const updated = prev.filter(t => t.id !== threatId);
      return updated;
    });
  }, []);

  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    const activeThreats = threats.filter(t => !t.resolved);

    if (activeThreats.length === 0) {
      recommendations.push('✅ No active security threats detected');
      recommendations.push('Continue monitoring your account regularly');
    }

    if (activeThreats.some(t => t.severity === 'critical')) {
      recommendations.push('🚨 Critical threat detected - Take immediate action');
      recommendations.push('Change your password immediately');
      recommendations.push('Enable all available security features');
    }

    if (activeThreats.some(t => t.type === 'brute_force')) {
      recommendations.push('Multiple failed login attempts detected');
      recommendations.push('Consider enabling account lockout protection');
    }

    if (activeThreats.some(t => t.type === 'unusual_location' || t.type === 'unusual_device')) {
      recommendations.push('New device or location detected');
      recommendations.push('Enable two-factor authentication if not already active');
    }

    if (recommendations.length === 0) {
      recommendations.push('Review your security settings regularly');
    }

    return recommendations;
  }, [threats]);

  const activeThreats = threats.filter(t => !t.resolved);

  const metrics: SecurityMetrics = {
    totalSessions: anomalyStats?.totalActivities ?? 1,
    failedLoginAttempts: activeThreats.filter(t => t.type === 'brute_force').length,
    activeSessions: anomalyStats?.uniqueDevices ?? 1,
    threatsDetected: threats.length,
    lastThreatDetected: threats.length > 0 ? threats[threats.length - 1]?.detected ?? null : null,
    averageRiskScore: riskScore
  };

  return {
    threatLevel: getThreatLevel(riskScore),
    riskScore,
    threats,
    activeThreats,
    metrics,
    detectAnomalies,
    checkRateLimit,
    reportSuspiciousActivity,
    resolveThread,
    dismissThreat,
    getRecommendations
  };
};
