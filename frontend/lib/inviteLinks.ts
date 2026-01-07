/**
 * Group Invite Link System
 * 
 * Generates and manages shareable invite links for groups.
 * Supports expiration, usage limits, and access control.
 */

'use client';

export interface InviteLink {
  id: string;
  groupId: string;
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  metadata?: {
    description?: string;
    allowedEmails?: string[];
    requireApproval?: boolean;
  };
}

export interface InviteLinkOptions {
  expiresIn?: number; // milliseconds
  maxUses?: number;
  description?: string;
  requireApproval?: boolean;
}

/**
 * Generate a unique invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create invite link URL
 */
export function createInviteLinkUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/invite/${code}`;
}

/**
 * Parse invite code from URL
 */
export function parseInviteCode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/invite\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if invite link is expired
 */
export function isInviteLinkExpired(link: InviteLink): boolean {
  if (!link.expiresAt) return false;
  return Date.now() > link.expiresAt;
}

/**
 * Check if invite link has reached max uses
 */
export function isInviteLinkMaxedOut(link: InviteLink): boolean {
  if (!link.maxUses) return false;
  return link.currentUses >= link.maxUses;
}

/**
 * Check if invite link is valid
 */
export function isInviteLinkValid(link: InviteLink): boolean {
  return (
    link.isActive &&
    !isInviteLinkExpired(link) &&
    !isInviteLinkMaxedOut(link)
  );
}

/**
 * Format expiration time
 */
export function formatExpirationTime(expiresAt?: number): string {
  if (!expiresAt) return 'Never expires';
  
  const now = Date.now();
  const diff = expiresAt - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
  return `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Format usage limit
 */
export function formatUsageLimit(link: InviteLink): string {
  if (!link.maxUses) return 'Unlimited uses';
  const remaining = link.maxUses - link.currentUses;
  return `${remaining} use${remaining !== 1 ? 's' : ''} remaining`;
}

/**
 * Get expiration options
 */
export const EXPIRATION_OPTIONS = [
  { label: '30 minutes', value: 30 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '6 hours', value: 6 * 60 * 60 * 1000 },
  { label: '12 hours', value: 12 * 60 * 60 * 1000 },
  { label: '1 day', value: 24 * 60 * 60 * 1000 },
  { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Never', value: 0 },
];

/**
 * Get max uses options
 */
export const MAX_USES_OPTIONS = [
  { label: '1 use', value: 1 },
  { label: '5 uses', value: 5 },
  { label: '10 uses', value: 10 },
  { label: '25 uses', value: 25 },
  { label: '50 uses', value: 50 },
  { label: '100 uses', value: 100 },
  { label: 'Unlimited', value: 0 },
];

/**
 * In-memory storage (use database in production)
 */
const inviteLinksStore = new Map<string, InviteLink>();

/**
 * Create a new invite link
 */
export async function createInviteLink(
  groupId: string,
  createdBy: string,
  options: InviteLinkOptions = {}
): Promise<InviteLink> {
  const code = generateInviteCode();
  const link: InviteLink = {
    id: `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    groupId,
    code,
    createdBy,
    createdAt: Date.now(),
    expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
    maxUses: options.maxUses,
    currentUses: 0,
    isActive: true,
    metadata: {
      description: options.description,
      requireApproval: options.requireApproval,
    },
  };

  inviteLinksStore.set(code, link);
  return link;
}

/**
 * Get invite link by code
 */
export async function getInviteLink(code: string): Promise<InviteLink | null> {
  return inviteLinksStore.get(code) || null;
}

/**
 * Get all invite links for a group
 */
export async function getGroupInviteLinks(groupId: string): Promise<InviteLink[]> {
  return Array.from(inviteLinksStore.values()).filter(
    (link) => link.groupId === groupId
  );
}

/**
 * Use an invite link
 */
export async function useInviteLink(code: string): Promise<InviteLink | null> {
  const link = inviteLinksStore.get(code);
  if (!link) return null;

  if (!isInviteLinkValid(link)) {
    return null;
  }

  link.currentUses++;
  inviteLinksStore.set(code, link);
  return link;
}

/**
 * Revoke an invite link
 */
export async function revokeInviteLink(code: string): Promise<boolean> {
  const link = inviteLinksStore.get(code);
  if (!link) return false;

  link.isActive = false;
  inviteLinksStore.set(code, link);
  return true;
}

/**
 * Delete an invite link
 */
export async function deleteInviteLink(code: string): Promise<boolean> {
  return inviteLinksStore.delete(code);
}

/**
 * React hook for invite link management
 */
export function useInviteLinks(groupId: string) {
  const [links, setLinks] = React.useState<InviteLink[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadLinks = async () => {
    setLoading(true);
    const groupLinks = await getGroupInviteLinks(groupId);
    setLinks(groupLinks);
    setLoading(false);
  };

  const create = async (options: InviteLinkOptions) => {
    // In production: get user address from auth
    const userAddress = '0x...';
    const link = await createInviteLink(groupId, userAddress, options);
    await loadLinks();
    return link;
  };

  const revoke = async (code: string) => {
    await revokeInviteLink(code);
    await loadLinks();
  };

  const remove = async (code: string) => {
    await deleteInviteLink(code);
    await loadLinks();
  };

  React.useEffect(() => {
    loadLinks();
  }, [groupId]);

  return {
    links,
    loading,
    create,
    revoke,
    remove,
    reload: loadLinks,
  };
}

import React from 'react';
