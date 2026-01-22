'use client';

/**
 * Session Keys Service
 * 
 * Enables pre-approved transactions for seamless UX.
 * Users can approve specific actions in advance, allowing
 * the app to execute them without additional signatures.
 * 
 * Supports:
 * - Time-limited sessions
 * - Spending limits
 * - Contract/function whitelisting
 * - Automatic expiry
 */

import { type Address, type Hex, keccak256, toBytes } from 'viem';

// ==================== TYPES ====================

export interface SessionKeyPermission {
  /** Allowed target contract */
  target: Address;
  /** Allowed function selector (4 bytes) */
  selector: Hex;
  /** Max value in wei per call */
  maxValuePerCall: bigint;
  /** Max total value in wei for session */
  maxTotalValue: bigint;
  /** Max number of calls allowed */
  maxCalls: number;
}

export interface SessionKey {
  /** Unique session ID */
  id: string;
  /** Session key address (derived or external) */
  keyAddress: Address;
  /** User who created the session */
  owner: Address;
  /** Chain ID this session is valid for */
  chainId: number;
  /** Permissions granted to this session */
  permissions: SessionKeyPermission[];
  /** Session start timestamp (seconds) */
  validFrom: number;
  /** Session end timestamp (seconds) */
  validUntil: number;
  /** Whether session is currently active */
  isActive: boolean;
  /** Number of calls made with this session */
  callsUsed: number;
  /** Total value spent through this session */
  valueSpent: bigint;
  /** Session creation timestamp */
  createdAt: number;
}

export interface CreateSessionParams {
  permissions: SessionKeyPermission[];
  /** Duration in seconds (default: 1 hour) */
  duration?: number;
  /** Optional label for the session */
  label?: string;
}

export interface SessionCallParams {
  sessionId: string;
  target: Address;
  callData: Hex;
  value?: bigint;
}

export interface SessionCallResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
}

// ==================== SESSION KEY STORAGE ====================

const SESSION_STORAGE_KEY = 'vfide_session_keys';

function getStoredSessions(): SessionKey[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((s: SessionKey) => ({
      ...s,
      maxValuePerCall: BigInt(s.permissions[0]?.maxValuePerCall || 0),
      maxTotalValue: BigInt(s.permissions[0]?.maxTotalValue || 0),
      valueSpent: BigInt(s.valueSpent || 0),
    }));
  } catch {
    return [];
  }
}

function storeSessions(sessions: SessionKey[]): void {
  if (typeof window === 'undefined') return;
  
  const serializable = sessions.map(s => ({
    ...s,
    permissions: s.permissions.map(p => ({
      ...p,
      maxValuePerCall: p.maxValuePerCall.toString(),
      maxTotalValue: p.maxTotalValue.toString(),
    })),
    valueSpent: s.valueSpent.toString(),
  }));
  
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serializable));
}

// ==================== SESSION KEY SERVICE ====================

export class SessionKeyService {
  private sessions: Map<string, SessionKey> = new Map();

  constructor() {
    // Load existing sessions from storage
    const stored = getStoredSessions();
    stored.forEach(s => this.sessions.set(s.id, s));
    
    // Clean up expired sessions
    this.cleanupExpired();
  }

  /**
   * Create a new session key
   */
  async createSession(
    owner: Address,
    chainId: number,
    params: CreateSessionParams
  ): Promise<SessionKey> {
    const now = Math.floor(Date.now() / 1000);
    const duration = params.duration || 3600; // 1 hour default
    
    // Generate session ID
    const sessionId = keccak256(
      toBytes(`${owner}-${chainId}-${now}-${Math.random()}`)
    ).slice(0, 18); // Short ID

    // Generate a session key address (in production, use proper key derivation)
    const keyAddress = keccak256(toBytes(`${sessionId}-key`)).slice(0, 42) as Address;

    const session: SessionKey = {
      id: sessionId,
      keyAddress,
      owner,
      chainId,
      permissions: params.permissions,
      validFrom: now,
      validUntil: now + duration,
      isActive: true,
      callsUsed: 0,
      valueSpent: BigInt(0),
      createdAt: now,
    };

    this.sessions.set(sessionId, session);
    this.persist();

    return session;
  }

  /**
   * Get all sessions for a user
   */
  getSessions(owner: Address, chainId?: number): SessionKey[] {
    const allSessions = Array.from(this.sessions.values());
    return allSessions.filter(s => 
      s.owner.toLowerCase() === owner.toLowerCase() &&
      (chainId === undefined || s.chainId === chainId)
    );
  }

  /**
   * Get active sessions only
   */
  getActiveSessions(owner: Address, chainId?: number): SessionKey[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getSessions(owner, chainId).filter(s => 
      s.isActive && s.validUntil > now
    );
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): SessionKey | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Check if a call is allowed by a session
   */
  validateCall(
    sessionId: string,
    target: Address,
    selector: Hex,
    value: bigint = BigInt(0)
  ): { valid: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    const now = Math.floor(Date.now() / 1000);

    if (!session.isActive) {
      return { valid: false, reason: 'Session is not active' };
    }

    if (now < session.validFrom) {
      return { valid: false, reason: 'Session not yet valid' };
    }

    if (now > session.validUntil) {
      return { valid: false, reason: 'Session expired' };
    }

    // Find matching permission
    const permission = session.permissions.find(p =>
      p.target.toLowerCase() === target.toLowerCase() &&
      (p.selector === '0x' || selector.startsWith(p.selector))
    );

    if (!permission) {
      return { valid: false, reason: 'No permission for this call' };
    }

    if (value > permission.maxValuePerCall) {
      return { valid: false, reason: 'Value exceeds per-call limit' };
    }

    if (session.valueSpent + value > permission.maxTotalValue) {
      return { valid: false, reason: 'Would exceed total value limit' };
    }

    if (permission.maxCalls > 0 && session.callsUsed >= permission.maxCalls) {
      return { valid: false, reason: 'Max calls reached' };
    }

    return { valid: true };
  }

  /**
   * Record a successful call
   */
  recordCall(sessionId: string, value: bigint = BigInt(0)): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.callsUsed++;
    session.valueSpent += value;
    this.sessions.set(sessionId, session);
    this.persist();
  }

  /**
   * Revoke a session
   */
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    this.sessions.set(sessionId, session);
    this.persist();
    return true;
  }

  /**
   * Revoke all sessions for a user
   */
  revokeAllSessions(owner: Address): number {
    let count = 0;
    this.sessions.forEach((session, id) => {
      if (session.owner.toLowerCase() === owner.toLowerCase() && session.isActive) {
        session.isActive = false;
        this.sessions.set(id, session);
        count++;
      }
    });
    this.persist();
    return count;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpired(): number {
    const now = Math.floor(Date.now() / 1000);
    let count = 0;
    
    this.sessions.forEach((session, id) => {
      if (session.validUntil < now - 86400) { // Expired more than 24h ago
        this.sessions.delete(id);
        count++;
      }
    });
    
    if (count > 0) {
      this.persist();
    }
    
    return count;
  }

  private persist(): void {
    storeSessions(Array.from(this.sessions.values()));
  }
}

// ==================== SINGLETON INSTANCE ====================

let sessionKeyInstance: SessionKeyService | null = null;

export function getSessionKeyService(): SessionKeyService {
  if (!sessionKeyInstance) {
    sessionKeyInstance = new SessionKeyService();
  }
  return sessionKeyInstance;
}

// ==================== REACT HOOK ====================

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';

export interface UseSessionKeysResult {
  /** All sessions for current user */
  sessions: SessionKey[];
  /** Active sessions only */
  activeSessions: SessionKey[];
  /** Create a new session */
  createSession: (params: CreateSessionParams) => Promise<SessionKey>;
  /** Revoke a session */
  revokeSession: (sessionId: string) => boolean;
  /** Revoke all sessions */
  revokeAll: () => number;
  /** Validate a call against sessions */
  validateCall: (sessionId: string, target: Address, selector: Hex, value?: bigint) => { valid: boolean; reason?: string };
  /** Check if user has any active sessions */
  hasActiveSessions: boolean;
  /** Refresh sessions */
  refresh: () => void;
}

export function useSessionKeys(): UseSessionKeysResult {
  const { address } = useAccount();
  const chainId = useChainId();
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const service = useMemo(() => getSessionKeyService(), []);

  const sessions = useMemo(() => {
    if (!address) return [];
    return service.getSessions(address, chainId);
  }, [address, chainId, service, updateTrigger]);

  const activeSessions = useMemo(() => {
    if (!address) return [];
    return service.getActiveSessions(address, chainId);
  }, [address, chainId, service, updateTrigger]);

  const createSession = useCallback(
    async (params: CreateSessionParams): Promise<SessionKey> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }
      const session = await service.createSession(address, chainId, params);
      setUpdateTrigger(t => t + 1);
      return session;
    },
    [address, chainId, service]
  );

  const revokeSession = useCallback(
    (sessionId: string): boolean => {
      const result = service.revokeSession(sessionId);
      setUpdateTrigger(t => t + 1);
      return result;
    },
    [service]
  );

  const revokeAll = useCallback((): number => {
    if (!address) return 0;
    const count = service.revokeAllSessions(address);
    setUpdateTrigger(t => t + 1);
    return count;
  }, [address, service]);

  const validateCall = useCallback(
    (sessionId: string, target: Address, selector: Hex, value?: bigint) => {
      return service.validateCall(sessionId, target, selector, value);
    },
    [service]
  );

  const refresh = useCallback(() => {
    setUpdateTrigger(t => t + 1);
  }, []);

  return {
    sessions,
    activeSessions,
    createSession,
    revokeSession,
    revokeAll,
    validateCall,
    hasActiveSessions: activeSessions.length > 0,
    refresh,
  };
}

// ==================== PRESET PERMISSIONS ====================

/**
 * Create permission for token approvals
 */
export function createApprovalPermission(
  tokenAddress: Address,
  _maxApprovalValue: bigint = BigInt(2) ** BigInt(256) - BigInt(1)
): SessionKeyPermission {
  return {
    target: tokenAddress,
    selector: '0x095ea7b3' as Hex, // approve(address,uint256)
    maxValuePerCall: BigInt(0),
    maxTotalValue: BigInt(0),
    maxCalls: 10,
  };
}

/**
 * Create permission for token transfers
 */
export function createTransferPermission(
  tokenAddress: Address,
  maxPerTransfer: bigint,
  maxTotal: bigint,
  maxCalls: number = 100
): SessionKeyPermission {
  return {
    target: tokenAddress,
    selector: '0xa9059cbb' as Hex, // transfer(address,uint256)
    maxValuePerCall: maxPerTransfer,
    maxTotalValue: maxTotal,
    maxCalls,
  };
}

/**
 * Create permission for any call to a contract
 */
export function createContractPermission(
  contractAddress: Address,
  maxValuePerCall: bigint = BigInt(0.1 * 1e18),
  maxTotalValue: bigint = BigInt(1 * 1e18),
  maxCalls: number = 50
): SessionKeyPermission {
  return {
    target: contractAddress,
    selector: '0x' as Hex, // Any function
    maxValuePerCall,
    maxTotalValue,
    maxCalls,
  };
}

export default SessionKeyService;
