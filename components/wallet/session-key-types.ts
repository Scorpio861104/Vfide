import { type Address } from 'viem';
import { type SessionKey, type CreateSessionParams } from '@/lib/sessionKeys/sessionKeyService';

export interface SessionKeyManagerProps {
  targetContracts?: { address: Address; name: string }[];
  className?: string;
}

export interface SessionKeyCardProps {
  session: SessionKey;
  onRevoke: (id: string) => void;
}

export interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: CreateSessionParams) => Promise<void>;
  targetContracts?: { address: Address; name: string }[];
}

export function formatTimeRemaining(validUntil: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = validUntil - now;

  if (remaining <= 0) return 'Expired';
  if (remaining < 60) return `${remaining}s`;
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`;
  return `${Math.floor(remaining / 86400)}d`;
}
