// Transaction integration for social messaging

export interface PaymentRequest {
  id: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  message?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'rejected';
  timestamp: number;
  txHash?: string;
}

export interface TransactionHistory {
  id: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  type: 'sent' | 'received';
  timestamp: number;
  txHash: string;
  message?: string;
}

export interface Notification {
  id: string;
  type: 'message' | 'friend_request' | 'payment_request' | 'payment_received' | 'endorsement' | 'badge' | 'group_invite';
  from: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
}
