// Advanced security configuration and types for VFIDE platform

export type TwoFactorMethod = 'totp' | 'sms' | 'email' | 'backup';
export type BiometricType = 'fingerprint' | 'face' | 'hardware-key' | 'passkey';
export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'failed_login'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | '2fa_failed'
  | 'biometric_enrolled'
  | 'biometric_removed'
  | 'biometric_verified'
  | 'biometric_failed'
  | 'password_changed'
  | 'email_changed'
  | 'session_expired'
  | 'suspicious_activity'
  | 'threat_detected'
  | 'security_setting_changed';

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type ThreatType =
  | 'brute_force'
  | 'unusual_location'
  | 'unusual_device'
  | 'rapid_requests'
  | 'suspicious_ip'
  | 'compromised_credentials'
  | 'session_hijacking'
  | 'unknown';

export interface TwoFactorConfig {
  enabled: boolean;
  method: TwoFactorMethod | null;
  backupCodesRemaining: number;
  lastVerified: Date | null;
}

export interface TOTPSetup {
  secret: string;
  qrCode: string; // data URL
  backupCodes: string[];
}

export interface BiometricCredential {
  id: string;
  type: BiometricType;
  name: string;
  createdAt: Date;
  lastUsed: Date | null;
}

export interface BiometricConfig {
  enabled: boolean;
  credentials: BiometricCredential[];
  platformSupport: {
    webauthn: boolean;
    fingerprint: boolean;
    faceId: boolean;
    hardwareKey: boolean;
  };
}

export interface SecurityLogEntry {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  deviceId?: string;
}

export interface ThreatDetectionResult {
  threatLevel: ThreatLevel;
  riskScore: number; // 0-100
  threats: ThreatAlert[];
  recommendations: string[];
}

export interface ThreatAlert {
  id: string;
  type: ThreatType;
  severity: ThreatLevel;
  detected: Date;
  message: string;
  details: Record<string, any>;
  resolved: boolean;
}

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
  hash: string;
}

export interface SessionActivity {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  ipAddress: string;
  location?: string;
  device: string;
  suspicious: boolean;
}

export interface SecurityMetrics {
  totalSessions: number;
  failedLoginAttempts: number;
  activeSessions: number;
  threatsDetected: number;
  lastThreatDetected: Date | null;
  averageRiskScore: number;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 },
  twoFactor: { maxAttempts: 3, windowMs: 5 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
  api: { maxAttempts: 100, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 }
};

export const THREAT_SCORE_THRESHOLDS = {
  low: 20,
  medium: 40,
  high: 70,
  critical: 90
};

export const getThreatLevel = (score: number): ThreatLevel => {
  if (score >= THREAT_SCORE_THRESHOLDS.critical) return 'critical';
  if (score >= THREAT_SCORE_THRESHOLDS.high) return 'high';
  if (score >= THREAT_SCORE_THRESHOLDS.medium) return 'medium';
  if (score >= THREAT_SCORE_THRESHOLDS.low) return 'low';
  return 'none';
};

export const SECURITY_STORAGE_KEYS = {
  twoFactor: 'vfide:security:2fa',
  biometric: 'vfide:security:biometric',
  logs: 'vfide:security:logs',
  threats: 'vfide:security:threats',
  deviceFingerprint: 'vfide:security:device',
  sessions: 'vfide:security:sessions'
} as const;

export const validateTOTPCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};

export const validateBackupCode = (code: string): boolean => {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
};

export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 4; k++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      if (j < 2) code += '-';
    }
    codes.push(code);
  }
  
  return codes;
};

export const generateDeviceFingerprint = (): DeviceFingerprint => {
  if (typeof window === 'undefined') {
    return {
      id: 'server',
      userAgent: 'server',
      platform: 'server',
      screenResolution: '0x0',
      timezone: 'UTC',
      language: 'en',
      hash: 'server'
    };
  }

  const data = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language
  };

  const hash = btoa(JSON.stringify(data));

  return {
    id: hash.substring(0, 16),
    ...data,
    hash
  };
};

export const calculateRiskScore = (factors: {
  failedAttempts: number;
  unusualLocation: boolean;
  unusualDevice: boolean;
  rapidRequests: boolean;
  suspiciousIp: boolean;
  noTwoFactor: boolean;
}): number => {
  let score = 0;

  score += factors.failedAttempts * 10;
  if (factors.unusualLocation) score += 25;
  if (factors.unusualDevice) score += 20;
  if (factors.rapidRequests) score += 15;
  if (factors.suspiciousIp) score += 30;
  if (factors.noTwoFactor) score += 10;

  return Math.min(100, score);
};

export const formatSecurityEventType = (type: SecurityEventType): string => {
  const map: Record<SecurityEventType, string> = {
    login: 'Login',
    logout: 'Logout',
    failed_login: 'Failed Login',
    '2fa_enabled': '2FA Enabled',
    '2fa_disabled': '2FA Disabled',
    '2fa_verified': '2FA Verified',
    '2fa_failed': '2FA Failed',
    biometric_enrolled: 'Biometric Enrolled',
    biometric_removed: 'Biometric Removed',
    biometric_verified: 'Biometric Verified',
    biometric_failed: 'Biometric Failed',
    password_changed: 'Password Changed',
    email_changed: 'Email Changed',
    session_expired: 'Session Expired',
    suspicious_activity: 'Suspicious Activity',
    threat_detected: 'Threat Detected',
    security_setting_changed: 'Security Setting Changed'
  };
  return map[type] || type;
};

export const formatThreatType = (type: ThreatType): string => {
  const map: Record<ThreatType, string> = {
    brute_force: 'Brute Force Attack',
    unusual_location: 'Unusual Location',
    unusual_device: 'Unusual Device',
    rapid_requests: 'Rapid Requests',
    suspicious_ip: 'Suspicious IP',
    compromised_credentials: 'Compromised Credentials',
    session_hijacking: 'Session Hijacking',
    unknown: 'Unknown Threat'
  };
  return map[type] || type;
};
