/**
 * Advanced Notification Hub Configuration
 * Comprehensive notification management with preferences and delivery channels
 */

// ============================================
// NOTIFICATION TYPES AND ENUMS
// ============================================

export enum NotificationType {
  TRANSACTION = 'transaction',
  SECURITY = 'security',
  GOVERNANCE = 'governance',
  REWARD = 'reward',
  ALERT = 'alert',
  SYSTEM = 'system',
  SOCIAL = 'social',
  MARKET = 'market',
}

export enum NotificationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DeliveryChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum NotificationFrequency {
  INSTANT = 'instant',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

export enum NotificationPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

// ============================================
// NOTIFICATION DATA STRUCTURES
// ============================================

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
  channels: DeliveryChannel[];
  frequency: NotificationFrequency;
  doNotDisturbStart?: string; // HH:mm format
  doNotDisturbEnd?: string;   // HH:mm format
}

export interface NotificationChannel {
  type: DeliveryChannel;
  enabled: boolean;
  verified: boolean;
  value: string; // email, phone, webhook URL, etc.
  lastUsed?: number;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  subject?: string;
  body: string;
  icon: string;
  color: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  description?: string;
  icon: string;
  color: string;
  timestamp: number;
  userId: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  
  // Metadata
  metadata: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  relatedId?: string; // Transaction hash, proposal ID, etc.
  
  // Delivery tracking
  channels: DeliveryChannel[];
  deliveryStatus: Record<DeliveryChannel, NotificationStatus>;
  readAt?: number;
  actionTakenAt?: number;
  expiresAt?: number;
}

export interface NotificationGroup {
  id: string;
  type: NotificationType;
  count: number;
  latestTimestamp: number;
  notifications: Notification[];
  isCollapsed: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  bySeverity: Record<NotificationSeverity, number>;
  deliveryFailures: number;
  lastReadTime: number;
}

export interface NotificationFilter {
  types?: NotificationType[];
  severities?: NotificationSeverity[];
  statuses?: NotificationStatus[];
  channels?: DeliveryChannel[];
  dateRange?: {
    start: number;
    end: number;
  };
  searchQuery?: string;
}

export interface NotificationSchedule {
  id: string;
  eventType: string; // 'proposal_voting', 'payment_due', etc.
  triggerCondition: Record<string, any>;
  notificationType: NotificationType;
  title: string;
  message: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    [NotificationType.TRANSACTION]: '#00FF88',
    [NotificationType.SECURITY]: '#FF6B6B',
    [NotificationType.GOVERNANCE]: '#9B59B6',
    [NotificationType.REWARD]: '#FFD700',
    [NotificationType.ALERT]: '#FF8C42',
    [NotificationType.SYSTEM]: '#00F0FF',
    [NotificationType.SOCIAL]: '#FF6B9D',
    [NotificationType.MARKET]: '#50C878',
  };
  return colors[type];
}

export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    [NotificationType.TRANSACTION]: '💸',
    [NotificationType.SECURITY]: '🔒',
    [NotificationType.GOVERNANCE]: '🗳️',
    [NotificationType.REWARD]: '🎁',
    [NotificationType.ALERT]: '⚠️',
    [NotificationType.SYSTEM]: '⚙️',
    [NotificationType.SOCIAL]: '👥',
    [NotificationType.MARKET]: '📈',
  };
  return icons[type];
}

export function getSeverityColor(severity: NotificationSeverity): string {
  const colors: Record<NotificationSeverity, string> = {
    [NotificationSeverity.LOW]: '#00F0FF',
    [NotificationSeverity.MEDIUM]: '#FFD700',
    [NotificationSeverity.HIGH]: '#FF8C42',
    [NotificationSeverity.CRITICAL]: '#FF6B6B',
  };
  return colors[severity];
}

export function getSeverityLabel(severity: NotificationSeverity): string {
  const labels: Record<NotificationSeverity, string> = {
    [NotificationSeverity.LOW]: 'Low',
    [NotificationSeverity.MEDIUM]: 'Medium',
    [NotificationSeverity.HIGH]: 'High',
    [NotificationSeverity.CRITICAL]: 'Critical',
  };
  return labels[severity];
}

export function getStatusLabel(status: NotificationStatus): string {
  const labels: Record<NotificationStatus, string> = {
    [NotificationStatus.PENDING]: 'Pending',
    [NotificationStatus.SENT]: 'Sent',
    [NotificationStatus.DELIVERED]: 'Delivered',
    [NotificationStatus.READ]: 'Read',
    [NotificationStatus.FAILED]: 'Failed',
  };
  return labels[status];
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return 'just now';
}

export function isInDoNotDisturb(
  startTime?: string,
  endTime?: string
): boolean {
  if (!startTime || !endTime) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  return currentTime >= startTime && currentTime <= endTime;
}

export function shouldNotify(
  preference: NotificationPreference,
  notification: Notification
): boolean {
  if (!preference.enabled) return false;
  if (preference.channels.length === 0) return false;
  if (isInDoNotDisturb(preference.doNotDisturbStart, preference.doNotDisturbEnd)) {
    return notification.severity === NotificationSeverity.CRITICAL;
  }
  return true;
}

export function groupNotificationsByType(
  notifications: Notification[]
): NotificationGroup[] {
  const grouped = new Map<NotificationType, Notification[]>();

  notifications.forEach((notif) => {
    if (!grouped.has(notif.type)) {
      grouped.set(notif.type, []);
    }
    grouped.get(notif.type)!.push(notif);
  });

  return Array.from(grouped.entries()).map(([type, notifs]) => ({
    id: `group-${type}`,
    type,
    count: notifs.length,
    latestTimestamp: Math.max(...notifs.map((n) => n.timestamp)),
    notifications: notifs.sort((a, b) => b.timestamp - a.timestamp),
    isCollapsed: false,
  }));
}

export function calculateNotificationStats(
  notifications: Notification[]
): NotificationStats {
  const byType = {} as Record<NotificationType, number>;
  const bySeverity = {} as Record<NotificationSeverity, number>;

  Object.values(NotificationType).forEach((type) => {
    byType[type] = notifications.filter((n) => n.type === type).length;
  });

  Object.values(NotificationSeverity).forEach((severity) => {
    bySeverity[severity] = notifications.filter(
      (n) => n.severity === severity
    ).length;
  });

  const unread = notifications.filter(
    (n) => n.status !== NotificationStatus.READ
  ).length;
  const deliveryFailures = notifications.filter(
    (n) => Object.values(n.deliveryStatus).some((s) => s === NotificationStatus.FAILED)
  ).length;

  return {
    total: notifications.length,
    unread,
    byType,
    bySeverity,
    deliveryFailures,
    lastReadTime: Math.max(
      ...notifications
        .filter((n) => n.readAt)
        .map((n) => n.readAt || 0),
      0
    ),
  };
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationType, NotificationPreference> = {
  [NotificationType.TRANSACTION]: {
    type: NotificationType.TRANSACTION,
    enabled: true,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    frequency: NotificationFrequency.INSTANT,
  },
  [NotificationType.SECURITY]: {
    type: NotificationType.SECURITY,
    enabled: true,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL, DeliveryChannel.SMS],
    frequency: NotificationFrequency.INSTANT,
  },
  [NotificationType.GOVERNANCE]: {
    type: NotificationType.GOVERNANCE,
    enabled: true,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    frequency: NotificationFrequency.DAILY,
  },
  [NotificationType.REWARD]: {
    type: NotificationType.REWARD,
    enabled: true,
    channels: [DeliveryChannel.IN_APP],
    frequency: NotificationFrequency.DAILY,
  },
  [NotificationType.ALERT]: {
    type: NotificationType.ALERT,
    enabled: true,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    frequency: NotificationFrequency.INSTANT,
  },
  [NotificationType.SYSTEM]: {
    type: NotificationType.SYSTEM,
    enabled: true,
    channels: [DeliveryChannel.IN_APP],
    frequency: NotificationFrequency.DAILY,
  },
  [NotificationType.SOCIAL]: {
    type: NotificationType.SOCIAL,
    enabled: true,
    channels: [DeliveryChannel.IN_APP],
    frequency: NotificationFrequency.DAILY,
  },
  [NotificationType.MARKET]: {
    type: NotificationType.MARKET,
    enabled: false,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    frequency: NotificationFrequency.WEEKLY,
  },
};

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  tx_success: {
    id: 'tx_success',
    type: NotificationType.TRANSACTION,
    name: 'Transaction Successful',
    subject: 'Your transaction was successful',
    body: 'Transaction {txHash} completed successfully',
    icon: '✅',
    color: '#00FF88',
  },
  tx_failed: {
    id: 'tx_failed',
    type: NotificationType.TRANSACTION,
    name: 'Transaction Failed',
    subject: 'Your transaction failed',
    body: 'Transaction failed: {error}',
    icon: '❌',
    color: '#FF6B6B',
  },
  security_alert: {
    id: 'security_alert',
    type: NotificationType.SECURITY,
    name: 'Security Alert',
    subject: 'Security alert detected',
    body: 'Unusual activity detected on your account: {details}',
    icon: '🔒',
    color: '#FF6B6B',
  },
  proposal_vote: {
    id: 'proposal_vote',
    type: NotificationType.GOVERNANCE,
    name: 'Proposal Available for Voting',
    subject: 'New proposal requires your vote',
    body: 'Proposal "{title}" is available for voting. Vote ends in {timeRemaining}',
    icon: '🗳️',
    color: '#9B59B6',
    actionLabel: 'Vote Now',
  },
};
