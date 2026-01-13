/**
 * Communities System
 * Larger-scale groups with topics, channels, roles, and moderation
 */

export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  banner?: string;
  category: CommunityCategory;
  visibility: 'public' | 'private' | 'invite-only';
  memberCount: number;
  channels: Channel[];
  roles: CommunityRole[];
  rules: CommunityRule[];
  createdBy: string;
  createdAt: number;
  verified: boolean;
  tags: string[];
}

export type CommunityCategory =
  | 'crypto'
  | 'gaming'
  | 'tech'
  | 'business'
  | 'art'
  | 'music'
  | 'education'
  | 'lifestyle'
  | 'other';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'announcement';
  icon?: string;
  position: number;
  allowedRoles?: string[]; // Role IDs that can access
  readOnly: boolean;
  createdAt: number;
}

export interface CommunityRole {
  id: string;
  name: string;
  color: string;
  permissions: CommunityPermission[];
  memberCount: number;
  position: number; // Higher = more authority
  isDefault: boolean;
}

export type CommunityPermission =
  | 'manage_community'
  | 'manage_channels'
  | 'manage_roles'
  | 'kick_members'
  | 'ban_members'
  | 'create_invites'
  | 'manage_messages'
  | 'mention_everyone'
  | 'send_messages'
  | 'read_messages'
  | 'voice_connect'
  | 'voice_speak';

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
  position: number;
}

export interface CommunityMember {
  userId: string;
  communityId: string;
  roles: string[]; // Role IDs
  joinedAt: number;
  nickname?: string;
}

export interface CommunityInvite {
  code: string;
  communityId: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  uses: number;
}

/**
 * Default roles for new communities
 */
export const DEFAULT_ROLES: Omit<CommunityRole, 'id' | 'memberCount'>[] = [
  {
    name: 'Owner',
    color: '#FFD700',
    permissions: [
      'manage_community',
      'manage_channels',
      'manage_roles',
      'kick_members',
      'ban_members',
      'create_invites',
      'manage_messages',
      'mention_everyone',
      'send_messages',
      'read_messages',
      'voice_connect',
      'voice_speak',
    ],
    position: 100,
    isDefault: false,
  },
  {
    name: 'Admin',
    color: '#FF6B9D',
    permissions: [
      'manage_channels',
      'kick_members',
      'ban_members',
      'create_invites',
      'manage_messages',
      'mention_everyone',
      'send_messages',
      'read_messages',
      'voice_connect',
      'voice_speak',
    ],
    position: 90,
    isDefault: false,
  },
  {
    name: 'Moderator',
    color: '#00F0FF',
    permissions: [
      'kick_members',
      'manage_messages',
      'send_messages',
      'read_messages',
      'voice_connect',
      'voice_speak',
    ],
    position: 50,
    isDefault: false,
  },
  {
    name: 'Member',
    color: '#A0A0A5',
    permissions: ['send_messages', 'read_messages', 'voice_connect', 'voice_speak'],
    position: 10,
    isDefault: true,
  },
];

/**
 * Create a new community
 */
export function createCommunity(
  name: string,
  description: string,
  category: CommunityCategory,
  createdBy: string,
  icon: string = '🏛️',
  visibility: Community['visibility'] = 'public'
): Community {
  const communityId = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create default roles
  const roles: CommunityRole[] = DEFAULT_ROLES.map((role, index) => ({
    ...role,
    id: `role_${communityId}_${index}`,
    memberCount: role.name === 'Owner' ? 1 : 0,
  }));

  // Create default channels
  const channels: Channel[] = [
    {
      id: `channel_${communityId}_general`,
      name: 'general',
      description: 'General discussion',
      type: 'text',
      icon: '💬',
      position: 0,
      readOnly: false,
      createdAt: Date.now(),
    },
    {
      id: `channel_${communityId}_announcements`,
      name: 'announcements',
      description: 'Important announcements',
      type: 'announcement',
      icon: '📢',
      position: 1,
      readOnly: true,
      createdAt: Date.now(),
    },
  ];

  return {
    id: communityId,
    name,
    description,
    icon,
    category,
    visibility,
    memberCount: 1,
    channels,
    roles,
    rules: [],
    createdBy,
    createdAt: Date.now(),
    verified: false,
    tags: [],
  };
}

/**
 * Create an invite code
 */
export function createInvite(
  communityId: string,
  createdBy: string,
  expiresInHours?: number,
  maxUses?: number
): CommunityInvite {
  return {
    code: generateInviteCode(),
    communityId,
    createdBy,
    createdAt: Date.now(),
    expiresAt: expiresInHours ? Date.now() + expiresInHours * 60 * 60 * 1000 : undefined,
    maxUses,
    uses: 0,
  };
}

/**
 * Generate random invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if invite is valid
 */
export function isInviteValid(invite: CommunityInvite): boolean {
  if (invite.expiresAt && Date.now() >= invite.expiresAt) return false;
  if (invite.maxUses && invite.uses >= invite.maxUses) return false;
  return true;
}

/**
 * Check if user has permission
 */
export function hasPermission(
  member: CommunityMember,
  community: Community,
  permission: CommunityPermission
): boolean {
  // Get all roles for this member
  const memberRoles = community.roles.filter((role) => member.roles.includes(role.id));

  // Check if any role has the permission
  return memberRoles.some((role) => role.permissions.includes(permission));
}

/**
 * Get member's highest role
 */
export function getHighestRole(member: CommunityMember, community: Community): CommunityRole | null {
  const memberRoles = community.roles.filter((role) => member.roles.includes(role.id));
  
  if (memberRoles.length === 0) return null;

  return memberRoles.reduce((highest, role) =>
    role.position > highest.position ? role : highest
  );
}

/**
 * Add channel to community
 */
export function addChannel(
  community: Community,
  name: string,
  type: Channel['type'],
  description?: string
): Community {
  const newChannel: Channel = {
    id: `channel_${community.id}_${Date.now()}`,
    name,
    description,
    type,
    position: community.channels.length,
    readOnly: type === 'announcement',
    createdAt: Date.now(),
  };

  return {
    ...community,
    channels: [...community.channels, newChannel],
  };
}

/**
 * Community storage
 */
export const communityStorage = {
  save(community: Community): void {
    const key = 'vfide_communities';
    const communities: Community[] = JSON.parse(localStorage.getItem(key) || '[]');
    const index = communities.findIndex((c) => c.id === community.id);

    if (index >= 0) {
      communities[index] = community;
    } else {
      communities.push(community);
    }

    localStorage.setItem(key, JSON.stringify(communities));
  },

  load(): Community[] {
    const key = 'vfide_communities';
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  get(communityId: string): Community | null {
    const communities = this.load();
    return communities.find((c) => c.id === communityId) || null;
  },

  delete(communityId: string): void {
    const communities = this.load();
    const filtered = communities.filter((c) => c.id !== communityId);
    localStorage.setItem('vfide_communities', JSON.stringify(filtered));
  },

  // Members
  saveMember(member: CommunityMember): void {
    const key = `vfide_community_members_${member.communityId}`;
    const members: CommunityMember[] = JSON.parse(localStorage.getItem(key) || '[]');
    const index = members.findIndex((m) => m.userId === member.userId);

    if (index >= 0) {
      members[index] = member;
    } else {
      members.push(member);
    }

    localStorage.setItem(key, JSON.stringify(members));
  },

  loadMembers(communityId: string): CommunityMember[] {
    const key = `vfide_community_members_${communityId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  removeMember(communityId: string, userId: string): void {
    const key = `vfide_community_members_${communityId}`;
    const members: CommunityMember[] = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = members.filter((m) => m.userId !== userId);
    localStorage.setItem(key, JSON.stringify(filtered));
  },

  // Invites
  saveInvite(invite: CommunityInvite): void {
    const key = 'vfide_community_invites';
    const invites: CommunityInvite[] = JSON.parse(localStorage.getItem(key) || '[]');
    invites.push(invite);
    localStorage.setItem(key, JSON.stringify(invites));
  },

  loadInvites(communityId: string): CommunityInvite[] {
    const key = 'vfide_community_invites';
    const allInvites: CommunityInvite[] = JSON.parse(localStorage.getItem(key) || '[]');
    return allInvites.filter((inv) => inv.communityId === communityId);
  },

  getInvite(code: string): CommunityInvite | null {
    const key = 'vfide_community_invites';
    const invites: CommunityInvite[] = JSON.parse(localStorage.getItem(key) || '[]');
    return invites.find((inv) => inv.code === code) || null;
  },

  updateInvite(invite: CommunityInvite): void {
    const key = 'vfide_community_invites';
    const invites: CommunityInvite[] = JSON.parse(localStorage.getItem(key) || '[]');
    const index = invites.findIndex((inv) => inv.code === invite.code);
    if (index >= 0) {
      invites[index] = invite;
      localStorage.setItem(key, JSON.stringify(invites));
    }
  },
};

/**
 * React hook for communities
 */
export function useCommunities(userId: string) {
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [userCommunities, setUserCommunities] = React.useState<Community[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    
    const allCommunities = communityStorage.load();
    setCommunities(allCommunities);

    // Filter user's communities
    const joined = allCommunities.filter((community) => {
      const members = communityStorage.loadMembers(community.id);
      return members.some((m) => m.userId === userId);
    });
    setUserCommunities(joined);

    setIsLoading(false);
  }, [userId]);

  const createCommunityHandler = React.useCallback(
    (
      name: string,
      description: string,
      category: CommunityCategory,
      _icon?: string,
      _visibility?: Community['visibility']
    ): Community => {
      const newCommunity: Community = createCommunity(name, description, category, userId);
      communityStorage.save(newCommunity);

      // Add creator as member with Owner role
      const ownerRole = newCommunity.roles.find((r: CommunityRole) => r.name === 'Owner');
      if (ownerRole) {
        const member: CommunityMember = {
          userId,
          communityId: newCommunity.id,
          roles: [ownerRole.id],
          joinedAt: Date.now(),
        };
        communityStorage.saveMember(member);
      }

      setCommunities((prev) => [...prev, newCommunity]);
      setUserCommunities((prev) => [...prev, newCommunity]);

      return newCommunity;
    },
    [userId]
  );

  const joinCommunity = React.useCallback(
    (community: Community, inviteCode?: string) => {
      // Verify invite if provided
      if (inviteCode && community.visibility === 'invite-only') {
        const invite = communityStorage.getInvite(inviteCode);
        if (!invite || !isInviteValid(invite)) {
          throw new Error('Invalid or expired invite');
        }

        // Update invite uses
        invite.uses += 1;
        communityStorage.updateInvite(invite);
      }

      // Get default member role
      const memberRole = community.roles.find((r) => r.isDefault);
      if (!memberRole) {
        throw new Error('No default role found');
      }

      // Add as member
      const member: CommunityMember = {
        userId,
        communityId: community.id,
        roles: [memberRole.id],
        joinedAt: Date.now(),
      };
      communityStorage.saveMember(member);

      // Update member count
      const updated = { ...community, memberCount: community.memberCount + 1 };
      communityStorage.save(updated);

      setUserCommunities((prev) => [...prev, updated]);
    },
    [userId]
  );

  const leaveCommunity = React.useCallback(
    (communityId: string) => {
      communityStorage.removeMember(communityId, userId);
      
      // Update member count
      const community = communityStorage.get(communityId);
      if (community) {
        const updated = { ...community, memberCount: community.memberCount - 1 };
        communityStorage.save(updated);
      }

      setUserCommunities((prev) => prev.filter((c) => c.id !== communityId));
    },
    [userId]
  );

  return {
    communities,
    userCommunities,
    isLoading,
    createCommunity: createCommunityHandler,
    joinCommunity,
    leaveCommunity,
  };
}

// For React hooks
import * as React from 'react';
