'use client';

/**
 * Group Permissions System
 * 
 * Role-based access control (RBAC) for groups with granular permissions.
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum GroupRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export enum Permission {
  // Group Management
  MANAGE_GROUP = 'manage_group',           // Edit group details
  DELETE_GROUP = 'delete_group',           // Delete group
  
  // Member Management
  INVITE_MEMBERS = 'invite_members',       // Create invite links
  REMOVE_MEMBERS = 'remove_members',       // Kick members
  BAN_MEMBERS = 'ban_members',             // Ban members
  
  // Role Management
  MANAGE_ROLES = 'manage_roles',           // Change member roles
  
  // Content Management
  DELETE_MESSAGES = 'delete_messages',     // Delete any message
  PIN_MESSAGES = 'pin_messages',           // Pin/unpin messages
  MANAGE_CHANNELS = 'manage_channels',     // Create/edit channels
  
  // Moderation
  MANAGE_INVITES = 'manage_invites',       // Revoke/manage invites
  VIEW_AUDIT_LOG = 'view_audit_log',       // View audit logs
  MANAGE_SETTINGS = 'manage_settings',     // Change group settings
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: GroupRole;
  joinedAt: number;
  customPermissions?: Permission[];        // Override permissions
  bannedPermissions?: Permission[];        // Explicitly denied permissions
}

export interface PermissionCheck {
  userId: string;
  groupId: string;
  permission: Permission;
  hasPermission: boolean;
  reason?: string;
}

// ============================================================================
// Role Permissions Mapping
// ============================================================================

const ROLE_PERMISSIONS: Record<GroupRole, Permission[]> = {
  [GroupRole.OWNER]: [
    // Owners have all permissions
    Permission.MANAGE_GROUP,
    Permission.DELETE_GROUP,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.BAN_MEMBERS,
    Permission.MANAGE_ROLES,
    Permission.DELETE_MESSAGES,
    Permission.PIN_MESSAGES,
    Permission.MANAGE_CHANNELS,
    Permission.MANAGE_INVITES,
    Permission.VIEW_AUDIT_LOG,
    Permission.MANAGE_SETTINGS,
  ],
  [GroupRole.ADMIN]: [
    Permission.MANAGE_GROUP,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.BAN_MEMBERS,
    Permission.DELETE_MESSAGES,
    Permission.PIN_MESSAGES,
    Permission.MANAGE_CHANNELS,
    Permission.MANAGE_INVITES,
    Permission.VIEW_AUDIT_LOG,
    Permission.MANAGE_SETTINGS,
  ],
  [GroupRole.MODERATOR]: [
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.DELETE_MESSAGES,
    Permission.PIN_MESSAGES,
    Permission.MANAGE_INVITES,
  ],
  [GroupRole.MEMBER]: [],
};

// ============================================================================
// Permission Metadata
// ============================================================================

export const PERMISSION_INFO: Record<Permission, { label: string; description: string; category: string }> = {
  [Permission.MANAGE_GROUP]: {
    label: 'Manage Group',
    description: 'Edit group name, description, and avatar',
    category: 'Group Management',
  },
  [Permission.DELETE_GROUP]: {
    label: 'Delete Group',
    description: 'Permanently delete the group',
    category: 'Group Management',
  },
  [Permission.INVITE_MEMBERS]: {
    label: 'Invite Members',
    description: 'Create and share invite links',
    category: 'Member Management',
  },
  [Permission.REMOVE_MEMBERS]: {
    label: 'Remove Members',
    description: 'Kick members from the group',
    category: 'Member Management',
  },
  [Permission.BAN_MEMBERS]: {
    label: 'Ban Members',
    description: 'Ban members from rejoining',
    category: 'Member Management',
  },
  [Permission.MANAGE_ROLES]: {
    label: 'Manage Roles',
    description: 'Change member roles and permissions',
    category: 'Role Management',
  },
  [Permission.DELETE_MESSAGES]: {
    label: 'Delete Messages',
    description: 'Delete any message in the group',
    category: 'Content Management',
  },
  [Permission.PIN_MESSAGES]: {
    label: 'Pin Messages',
    description: 'Pin or unpin messages',
    category: 'Content Management',
  },
  [Permission.MANAGE_CHANNELS]: {
    label: 'Manage Channels',
    description: 'Create, edit, and delete channels',
    category: 'Content Management',
  },
  [Permission.MANAGE_INVITES]: {
    label: 'Manage Invites',
    description: 'View and revoke invite links',
    category: 'Moderation',
  },
  [Permission.VIEW_AUDIT_LOG]: {
    label: 'View Audit Log',
    description: 'View group activity and moderation logs',
    category: 'Moderation',
  },
  [Permission.MANAGE_SETTINGS]: {
    label: 'Manage Settings',
    description: 'Change group settings and preferences',
    category: 'Moderation',
  },
};

// ============================================================================
// Role Metadata
// ============================================================================

export const ROLE_INFO: Record<GroupRole, { label: string; description: string; color: string }> = {
  [GroupRole.OWNER]: {
    label: 'Owner',
    description: 'Full control over the group',
    color: 'text-yellow-400',
  },
  [GroupRole.ADMIN]: {
    label: 'Admin',
    description: 'Manage group settings and members',
    color: 'text-red-400',
  },
  [GroupRole.MODERATOR]: {
    label: 'Moderator',
    description: 'Moderate content and members',
    color: 'text-blue-400',
  },
  [GroupRole.MEMBER]: {
    label: 'Member',
    description: 'Regular group member',
    color: 'text-gray-400',
  },
};

// ============================================================================
// Permission Checking Functions
// ============================================================================

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: GroupRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: GroupRole, permission: Permission): boolean {
  return getRolePermissions(role).includes(permission);
}

/**
 * Check if a member has a specific permission
 */
export function memberHasPermission(member: GroupMember, permission: Permission): boolean {
  // Check if permission is explicitly banned
  if (member.bannedPermissions?.includes(permission)) {
    return false;
  }

  // Check custom permissions (overrides)
  if (member.customPermissions?.includes(permission)) {
    return true;
  }

  // Check role permissions
  return roleHasPermission(member.role, permission);
}

/**
 * Check if a user can perform an action on a target user
 * (e.g., can admin kick moderator?)
 */
export function canManageMember(
  actor: GroupMember,
  target: GroupMember,
  permission: Permission
): boolean {
  // Can't manage yourself (except owner)
  if (actor.userId === target.userId && actor.role !== GroupRole.OWNER) {
    return false;
  }

  // Owner can manage anyone
  if (actor.role === GroupRole.OWNER) {
    return true;
  }

  // Can't manage someone with equal or higher role
  const roleHierarchy = {
    [GroupRole.OWNER]: 4,
    [GroupRole.ADMIN]: 3,
    [GroupRole.MODERATOR]: 2,
    [GroupRole.MEMBER]: 1,
  };

  if (roleHierarchy[target.role] >= roleHierarchy[actor.role]) {
    return false;
  }

  // Check if actor has the required permission
  return memberHasPermission(actor, permission);
}

/**
 * Get all permissions for a member
 */
export function getMemberPermissions(member: GroupMember): Permission[] {
  const rolePerms = getRolePermissions(member.role);
  const customPerms = member.customPermissions || [];
  const bannedPerms = member.bannedPermissions || [];

  // Combine role and custom permissions, remove banned
  const allPerms = [...new Set([...rolePerms, ...customPerms])];
  return allPerms.filter(p => !bannedPerms.includes(p));
}

/**
 * Group permissions by category
 */
export function getPermissionsByCategory(): Record<string, Permission[]> {
  const categories: Record<string, Permission[]> = {};

  Object.entries(PERMISSION_INFO).forEach(([permission, info]) => {
    if (!categories[info.category]) {
      categories[info.category] = [];
    }
    categories[info.category]!.push(permission as Permission);
  });

  return categories;
}

// ============================================================================
// Mock Storage (Replace with database in production)
// ============================================================================

const groupMembersStore = new Map<string, GroupMember>();

/**
 * Get member by user ID and group ID
 */
export function getMember(userId: string, groupId: string): GroupMember | null {
  const key = `${groupId}:${userId}`;
  return groupMembersStore.get(key) || null;
}

/**
 * Get all members of a group
 */
export function getGroupMembers(groupId: string): GroupMember[] {
  const members: GroupMember[] = [];
  groupMembersStore.forEach((member, key) => {
    if (key.startsWith(`${groupId}:`)) {
      members.push(member);
    }
  });
  return members;
}

/**
 * Update member role
 */
export function updateMemberRole(
  userId: string,
  groupId: string,
  role: GroupRole
): GroupMember | null {
  const key = `${groupId}:${userId}`;
  const member = groupMembersStore.get(key);
  
  if (!member) return null;

  const updated = { ...member, role };
  groupMembersStore.set(key, updated);
  return updated;
}

/**
 * Update member custom permissions
 */
export function updateMemberPermissions(
  userId: string,
  groupId: string,
  customPermissions?: Permission[],
  bannedPermissions?: Permission[]
): GroupMember | null {
  const key = `${groupId}:${userId}`;
  const member = groupMembersStore.get(key);
  
  if (!member) return null;

  const updated = {
    ...member,
    customPermissions: customPermissions !== undefined ? customPermissions : member.customPermissions,
    bannedPermissions: bannedPermissions !== undefined ? bannedPermissions : member.bannedPermissions,
  };
  
  groupMembersStore.set(key, updated);
  return updated;
}

/**
 * Create a new member
 */
export function createMember(
  userId: string,
  groupId: string,
  role: GroupRole = GroupRole.MEMBER
): GroupMember {
  const key = `${groupId}:${userId}`;
  const member: GroupMember = {
    userId,
    groupId,
    role,
    joinedAt: Date.now(),
  };
  groupMembersStore.set(key, member);
  return member;
}

function toGroupRole(value: unknown): GroupRole {
  if (value === GroupRole.OWNER) return GroupRole.OWNER;
  if (value === GroupRole.ADMIN) return GroupRole.ADMIN;
  if (value === GroupRole.MODERATOR) return GroupRole.MODERATOR;
  return GroupRole.MEMBER;
}

function toClientMember(member: unknown, fallbackGroupId: string): GroupMember | null {
  if (!member || typeof member !== 'object' || Array.isArray(member)) {
    return null;
  }

  const source = member as Record<string, unknown>;
  const userIdRaw = typeof source.userId === 'string'
    ? source.userId
    : (typeof source.user_address === 'string' ? source.user_address : null);

  if (!userIdRaw) {
    return null;
  }

  const role = toGroupRole(source.role);
  const joinedAt = typeof source.joinedAt === 'number'
    ? source.joinedAt
    : new Date(String(source.joined_at ?? Date.now())).getTime();

  const groupIdFromPayload = source.groupId;
  const normalizedGroupId =
    typeof groupIdFromPayload === 'string'
      ? groupIdFromPayload
      : fallbackGroupId;

  return {
    userId: userIdRaw,
    groupId: normalizedGroupId,
    role,
    joinedAt: Number.isFinite(joinedAt) ? joinedAt : Date.now(),
    customPermissions: Array.isArray(source.customPermissions)
      ? (source.customPermissions as Permission[])
      : undefined,
    bannedPermissions: Array.isArray(source.bannedPermissions)
      ? (source.bannedPermissions as Permission[])
      : undefined,
  };
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to get member permissions
 */
export function useMemberPermissions(userId?: string, groupId?: string) {
  const [member, setMember] = useState<GroupMember | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const loadMember = async () => {
      try {
        const response = await fetch(`/api/groups/members?userAddress=${encodeURIComponent(userId)}&groupId=${groupId}`);
        const data = await response.json();

        if (data.success && data.member) {
          const mapped = toClientMember(data.member, groupId);
          if (mapped) {
            setMember(mapped);
            setPermissions(getMemberPermissions(mapped));
          }
        }
      } catch (err) {
        logger.error('Failed to load member permissions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMember();
  }, [userId, groupId]);

  const hasPermission = useCallback(
    (permission: Permission) => {
      return member ? memberHasPermission(member, permission) : false;
    },
    [member]
  );

  const hasAnyPermission = useCallback(
    (perms: Permission[]) => {
      return perms.some(p => hasPermission(p));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (perms: Permission[]) => {
      return perms.every(p => hasPermission(p));
    },
    [hasPermission]
  );

  return {
    member,
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

/**
 * Hook to manage group members
 */
export function useGroupMembers(groupId?: string) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/groups/members?groupId=${groupId}`);
      const data = await response.json();

      if (data.success) {
          const normalizedMembers = Array.isArray(data.members)
            ? data.members
                .map((member: unknown) => toClientMember(member, groupId))
                .filter((member: GroupMember | null): member is GroupMember => member !== null)
            : [];
          setMembers(normalizedMembers);
      }
    } catch (err) {
      logger.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const updateRole = async (userId: string, role: GroupRole) => {
    try {
      const response = await fetch('/api/groups/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
            userAddress: userId,
          role,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadMembers();
        return data.member;
      }
      throw new Error(data.error || 'Failed to update role');
    } catch (err) {
      logger.error('Failed to update role:', err);
      throw err;
    }
  };

  const updatePermissions = async (
    userId: string,
    _customPermissions?: Permission[],
    _bannedPermissions?: Permission[]
  ) => {
    try {
      // API currently does not expose custom permission persistence.
      // Keep UX stable by refreshing data and returning the local member view.
      await loadMembers();
      return members.find((member) => member.userId === userId) ?? null;
    } catch (err) {
      logger.error('Failed to update permissions:', err);
      throw err;
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/groups/members?groupId=${groupId}&userAddress=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        await loadMembers();
        return true;
      }
      throw new Error(data.error || 'Failed to remove member');
    } catch (err) {
      logger.error('Failed to remove member:', err);
      throw err;
    }
  };

  return {
    members,
    loading,
    updateRole,
    updatePermissions,
    removeMember,
    reload: loadMembers,
  };
}
