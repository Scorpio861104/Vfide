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
import { getEnv } from '@/lib/env';

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
  /** Optional max token amount per call for ERC-20 amount-bearing selectors */
  maxTokenAmountPerCall?: bigint;
  /** Optional max cumulative token amount for ERC-20 amount-bearing selectors */
  maxTokenAmountTotal?: bigint;
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
  /** Total token amount consumed by amount-bearing calldata (approve/transfer) */
  tokenAmountSpent: bigint;
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
const SESSION_KEY_MIN_DURATION_SECONDS = 60;
const SESSION_KEY_DEFAULT_DURATION_SECONDS = 1800;
const SESSION_KEY_MAX_DURATION_SECONDS = 4 * 60 * 60;

function resolveMaxSessionDurationSeconds(): number {
  // Read raw env first so test/runtime overrides are respected even if getEnv() was memoized earlier.
  const rawEnvValue = process.env.SESSION_KEY_MAX_DURATION_SECONDS ?? process.env.NEXT_PUBLIC_SESSION_KEY_MAX_DURATION_SECONDS;
  const parsedFromProcess = rawEnvValue !== undefined
    ? Number.parseInt(rawEnvValue, 10)
    : Number.NaN;
  const parsed = Number.isInteger(parsedFromProcess)
    ? parsedFromProcess
    : getEnv().SESSION_KEY_MAX_DURATION_SECONDS;

  if (!Number.isInteger(parsed) || parsed < SESSION_KEY_MIN_DURATION_SECONDS) {
    return SESSION_KEY_MAX_DURATION_SECONDS;
  }

  return parsed;
}

function getSessionStorageBackend(): Storage | null {
  if (typeof window === 'undefined') return null;

  if (getEnv().NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS) {
    return window.localStorage;
  }

  return window.sessionStorage;
}

function getStoredSessions(): SessionKey[] {
  const storage = getSessionStorageBackend();
  if (!storage) return [];
  
  try {
    // Default to session-scoped storage to reduce persistence after browser compromise.
    if (typeof window !== 'undefined' && storage === window.sessionStorage) {
      try {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignore storage cleanup errors.
      }
    }

    const stored = storage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((s: SessionKey) => ({
      ...s,
      permissions: (s.permissions || []).map((p) => ({
        ...p,
        maxValuePerCall: BigInt(p.maxValuePerCall || 0),
        maxTotalValue: BigInt(p.maxTotalValue || 0),
        maxTokenAmountPerCall: p.maxTokenAmountPerCall !== undefined ? BigInt(p.maxTokenAmountPerCall) : undefined,
        maxTokenAmountTotal: p.maxTokenAmountTotal !== undefined ? BigInt(p.maxTokenAmountTotal) : undefined,
      })),
      valueSpent: BigInt(s.valueSpent || 0),
      tokenAmountSpent: BigInt((s as SessionKey & { tokenAmountSpent?: string | number }).tokenAmountSpent || 0),
    }));
  } catch {
    return [];
  }
}

function storeSessions(sessions: SessionKey[]): void {
  const storage = getSessionStorageBackend();
  if (!storage) return;
  
  const serializable = sessions.map(s => ({
    ...s,
    permissions: s.permissions.map(p => ({
      ...p,
      maxValuePerCall: p.maxValuePerCall.toString(),
      maxTotalValue: p.maxTotalValue.toString(),
      maxTokenAmountPerCall: p.maxTokenAmountPerCall !== undefined ? p.maxTokenAmountPerCall.toString() : undefined,
      maxTokenAmountTotal: p.maxTokenAmountTotal !== undefined ? p.maxTokenAmountTotal.toString() : undefined,
    })),
    valueSpent: s.valueSpent.toString(),
    tokenAmountSpent: s.tokenAmountSpent.toString(),
  }));
  
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serializable));
}

// ==================== SESSION KEY SERVICE ====================

export class SessionKeyService {
  private sessions: Map<string, SessionKey> = new Map();

  private extractErc20AmountFromCallData(callData: Hex): bigint | null {
    if (typeof callData !== 'string' || !callData.startsWith('0x') || callData.length < 10) {
      return null;
    }

    const selector = callData.slice(0, 10).toLowerCase();
    if (selector !== '0x095ea7b3' && selector !== '0xa9059cbb') {
      return null;
    }

    // ABI encoding: 4-byte selector + 32-byte address + 32-byte amount
    if (callData.length < 10 + (64 * 2)) {
      return null;
    }

    const amountHex = callData.slice(10 + 64, 10 + 128);
    if (!/^[0-9a-fA-F]{64}$/.test(amountHex)) {
      return null;
    }

    return BigInt(`0x${amountHex}`);
  }

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
    const duration = params.duration ?? SESSION_KEY_DEFAULT_DURATION_SECONDS;
    const maxAllowedDuration = resolveMaxSessionDurationSeconds();
    if (duration < SESSION_KEY_MIN_DURATION_SECONDS) {
      throw new Error(`Session duration must be at least ${SESSION_KEY_MIN_DURATION_SECONDS} seconds`);
    }
    if (duration > maxAllowedDuration) {
      throw new Error(`Session duration exceeds maximum of ${maxAllowedDuration} seconds`);
    }
    
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
      tokenAmountSpent: BigInt(0),
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
    value: bigint = BigInt(0),
    callData?: Hex
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

    if (permission.maxTokenAmountPerCall !== undefined || permission.maxTokenAmountTotal !== undefined) {
      if (!callData) {
        return { valid: false, reason: 'Missing calldata for token amount policy' };
      }

      const tokenAmount = this.extractErc20AmountFromCallData(callData);
      if (tokenAmount === null) {
        return { valid: false, reason: 'Unable to parse token amount from calldata' };
      }

      if (
        permission.maxTokenAmountPerCall !== undefined &&
        tokenAmount > permission.maxTokenAmountPerCall
      ) {
        return { valid: false, reason: 'Token amount exceeds per-call limit' };
      }

      if (
        permission.maxTokenAmountTotal !== undefined &&
        session.tokenAmountSpent + tokenAmount > permission.maxTokenAmountTotal
      ) {
        return { valid: false, reason: 'Would exceed token amount total limit' };
      }
    }

    return { valid: true };
  }

  /**
   * Record a successful call
   */
  recordCall(sessionId: string, value: bigint = BigInt(0), callData?: Hex): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.callsUsed++;
    session.valueSpent += value;
    const tokenAmount = callData ? this.extractErc20AmountFromCallData(callData) : null;
    if (tokenAmount !== null) {
      session.tokenAmountSpent += tokenAmount;
    }
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
  validateCall: (sessionId: string, target: Address, selector: Hex, value?: bigint, callData?: Hex) => { valid: boolean; reason?: string };
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
    (sessionId: string, target: Address, selector: Hex, value?: bigint, callData?: Hex) => {
      return service.validateCall(sessionId, target, selector, value, callData);
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
  maxApprovalValue: bigint,
  maxCalls: number = 1
): SessionKeyPermission {
  if (maxApprovalValue <= BigInt(0)) {
    throw new Error('maxApprovalValue must be greater than zero');
  }

  return {
    target: tokenAddress,
    selector: '0x095ea7b3' as Hex, // approve(address,uint256)
    maxValuePerCall: BigInt(0),
    maxTotalValue: BigInt(0),
    maxCalls,
    maxTokenAmountPerCall: maxApprovalValue,
    maxTokenAmountTotal: maxApprovalValue,
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
  if (maxPerTransfer <= BigInt(0) || maxTotal <= BigInt(0)) {
    throw new Error('Token transfer limits must be greater than zero');
  }

  return {
    target: tokenAddress,
    selector: '0xa9059cbb' as Hex, // transfer(address,uint256)
    maxValuePerCall: BigInt(0),
    maxTotalValue: BigInt(0),
    maxCalls,
    maxTokenAmountPerCall: maxPerTransfer,
    maxTokenAmountTotal: maxTotal,
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
