import { useCallback, useEffect, useState } from 'react';
import {
  ThreatDetectionResult,
  ThreatAlert,
  ThreatLevel,
  ThreatType,
  DeviceFingerprint,
  SessionActivity as _SessionActivity,
  SecurityMetrics,
  SECURITY_STORAGE_KEYS,
  getThreatLevel,
  calculateRiskScore,
  generateDeviceFingerprint,
  DEFAULT_RATE_LIMITS
} from '@/config/security-advanced';
import { logger } from '@/lib/logger';

export interface UseThreatDetectionResult {
  threatLevel: ThreatLevel;
  riskScore: number;
  threats: ThreatAlert[];
  activeThreats: ThreatAlert[];
  metrics: SecurityMetrics;
  
  // Detection methods
  detectAnomalies: () => Promise<ThreatDetectionResult>;
  checkRateLimit: (action: string) => boolean;
  reportSuspiciousActivity: (type: ThreatType, details: Record<string, any>) => void;
  
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

const loadThreats = (): ThreatAlert[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SECURITY_STORAGE_KEYS.threats);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((threat: { id: string; level: string; type: string; detected: string; details: Record<string, unknown>; resolved: boolean }) => ({
      ...threat,
      detected: new Date(threat.detected)
    }));
  } catch (error) {
    logger.error('Failed to load threats', error);
    return [];
  }
};

const saveThreats = (threats: ThreatAlert[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SECURITY_STORAGE_KEYS.threats, JSON.stringify(threats));
};

const generateThreatId = (): string => {
  return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const checkUnusualLocation = (): boolean => {
  // In production: Compare with known locations from backend
  return false;
};

const checkUnusualDevice = (currentDevice: DeviceFingerprint): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const stored = localStorage.getItem(SECURITY_STORAGE_KEYS.deviceFingerprint);
    if (!stored) {
      // First time device, save it
      localStorage.setItem(SECURITY_STORAGE_KEYS.deviceFingerprint, JSON.stringify(currentDevice));
      return false;
    }

    const knownDevice: DeviceFingerprint = JSON.parse(stored);
    return knownDevice.hash !== currentDevice.hash;
  } catch (_error) {
    return false;
  }
};

const checkSuspiciousIp = (): boolean => {
  // In production: Check against threat intelligence databases
  return false;
};

export const useThreatDetection = (): UseThreatDetectionResult => {
  const [threats, setThreats] = useState<ThreatAlert[]>(loadThreats());
  const [riskScore, setRiskScore] = useState<number>(0);
  const [rateLimits, setRateLimits] = useState<Map<string, RateLimitEntry>>(new Map());

  useEffect(() => {
    const loaded = loadThreats();
    setThreats(loaded);
  }, []);

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
    details: Record<string, any> = {}
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
      saveThreats(updated);
      return updated;
    });
  }, []);

  const detectAnomalies = useCallback(async (): Promise<ThreatDetectionResult> => {
    const deviceFingerprint = generateDeviceFingerprint();
    const unusualLocation = checkUnusualLocation();
    const unusualDevice = checkUnusualDevice(deviceFingerprint);
    const suspiciousIp = checkSuspiciousIp();

    const detectedThreats: ThreatAlert[] = [];

    if (unusualLocation) {
      const threat: ThreatAlert = {
        id: generateThreatId(),
        type: 'unusual_location',
        severity: 'medium',
        detected: new Date(),
        message: 'Login from unusual location detected',
        details: { location: deviceFingerprint.timezone },
        resolved: false
      };
      detectedThreats.push(threat);
    }

    if (unusualDevice) {
      const threat: ThreatAlert = {
        id: generateThreatId(),
        type: 'unusual_device',
        severity: 'medium',
        detected: new Date(),
        message: 'New device detected',
        details: { device: deviceFingerprint.userAgent },
        resolved: false
      };
      detectedThreats.push(threat);
    }

    if (suspiciousIp) {
      const threat: ThreatAlert = {
        id: generateThreatId(),
        type: 'suspicious_ip',
        severity: 'high',
        detected: new Date(),
        message: 'Suspicious IP address detected',
        details: {},
        resolved: false
      };
      detectedThreats.push(threat);
    }

    if (detectedThreats.length > 0) {
      setThreats(prev => {
        const updated = [...prev, ...detectedThreats];
        saveThreats(updated);
        return updated;
      });
    }

    const score = calculateRiskScore({
      failedAttempts: 0,
      unusualLocation,
      unusualDevice,
      rapidRequests: false,
      suspiciousIp,
      noTwoFactor: false
    });

    const recommendations: string[] = [];
    if (unusualLocation || unusualDevice) {
      recommendations.push('Enable two-factor authentication for additional security');
    }
    if (suspiciousIp) {
      recommendations.push('Change your password immediately');
      recommendations.push('Review recent security logs');
    }
    if (detectedThreats.length === 0) {
      recommendations.push('Your account security looks good');
    }

    return {
      threatLevel: getThreatLevel(score),
      riskScore: score,
      threats: detectedThreats,
      recommendations
    };
  }, []);

  const checkRateLimit = useCallback((action: string): boolean => {
    const config = DEFAULT_RATE_LIMITS[action] || DEFAULT_RATE_LIMITS.api;
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
    details: Record<string, any>
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
  }, [addThreat]);

  const resolveThread = useCallback((threatId: string) => {
    setThreats(prev => {
      const updated = prev.map(t =>
        t.id === threatId ? { ...t, resolved: true } : t
      );
      saveThreats(updated);
      return updated;
    });
  }, []);

  const dismissThreat = useCallback((threatId: string) => {
    setThreats(prev => {
      const updated = prev.filter(t => t.id !== threatId);
      saveThreats(updated);
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
    totalSessions: 1, // Mock value
    failedLoginAttempts: activeThreats.filter(t => t.type === 'brute_force').length,
    activeSessions: 1, // Mock value
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
