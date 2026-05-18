// Friend Circles - Organize friends into categories

export interface FriendCircle {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  members: string[]; // wallet addresses
  createdAt: number;
  isDefault?: boolean;
}

export interface CircleMember {
  friendAddress: string;
  circleId: string;
  nickname?: string; // Circle-specific nickname
  addedAt: number;
  notes?: string;
}

export const DEFAULT_CIRCLES: Omit<FriendCircle, 'id' | 'members' | 'createdAt'>[] = [
  {
    name: 'Close Friends',
    description: 'Your closest friends',
    color: '#00F0FF',
    icon: 'heart',
    isDefault: true,
  },
  {
    name: 'Family',
    description: 'Family members',
    color: '#FF6B9D',
    icon: 'home',
    isDefault: true,
  },
  {
    name: 'Work',
    description: 'Professional contacts',
    color: '#A78BFA',
    icon: 'briefcase',
    isDefault: true,
  },
  {
    name: 'Community',
    description: 'VFIDE community members',
    color: '#50C878',
    icon: 'users',
    isDefault: true,
  },
];
