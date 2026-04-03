'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function isStructurallyValidGroupPayloadForGroup(content: string, groupId: number): boolean {
  try {
    const payload = JSON.parse(content) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') return false;

    if (payload.v !== 2) return false;
    if (typeof payload.groupId !== 'string' || payload.groupId.trim() !== String(groupId)) return false;
    if (typeof payload.ts !== 'number' || !Number.isSafeInteger(payload.ts) || payload.ts <= 0) return false;
    if (typeof payload.groupSig !== 'string' || !ETH_SIGNATURE_REGEX.test(payload.groupSig)) return false;

    const members = payload.members;
    const encryptedForMembers = payload.encryptedForMembers;
    if (!Array.isArray(members) || members.length === 0) return false;
    if (!encryptedForMembers || typeof encryptedForMembers !== 'object' || Array.isArray(encryptedForMembers)) {
      return false;
    }

    const encryptedMap = encryptedForMembers as Record<string, unknown>;
    for (const member of members) {
      if (typeof member !== 'string' || member.length === 0) return false;
      if (typeof encryptedMap[member] !== 'string') return false;
    }

    return true;
  } catch {
    return false;
  }
}
