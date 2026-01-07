// Types for the messaging system

export interface Friend {
  address: string;
  alias?: string;
  avatar?: string;
  proofScore?: number;
  addedDate: number;
  lastSeen?: number;
  isOnline?: boolean;
  isFavorite?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  from: string;
  to: string | string[]; // Single address or array for groups
  encryptedContent: string;
  decryptedContent?: string; // Decrypted locally
  timestamp: number;
  read: boolean;
  verified: boolean;
  type: 'direct' | 'group';
  editedAt?: number; // Timestamp of last edit
  deletedAt?: number; // Soft delete timestamp
  reactions?: Record<string, string[]>; // emoji -> addresses
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  type: 'direct' | 'group';
  groupName?: string;
  groupAvatar?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  members: string[];
  admins: string[];
  creator: string;
  createdAt: number;
  isPrivate: boolean;
}

export interface MessageNotification {
  id: string;
  from: string;
  fromAlias?: string;
  preview: string;
  timestamp: number;
  conversationId: string;
  read: boolean;
}
