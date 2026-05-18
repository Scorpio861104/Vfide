// Group messaging types and interfaces

export interface GroupMember {
  address: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: number;
  lastSeen?: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  from: string;
  encryptedContent: string;
  decryptedContent?: string;
  content?: string; // Legacy plaintext field (read-only migration support)
  timestamp: number;
  encrypted: boolean;
  readBy: string[];
}

export interface Group {
  id: string | number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: number;
  lastActivity: number;
}
