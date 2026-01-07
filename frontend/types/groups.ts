// Group messaging types and interfaces

export interface GroupMember {
  address: string;
  role: 'admin' | 'member';
  joinedAt: number;
  lastSeen?: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  from: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  readBy: string[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: number;
  lastActivity: number;
}
