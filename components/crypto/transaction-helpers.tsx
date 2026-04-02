import React from 'react';
import { type Transaction } from '@/lib/crypto';
import { ArrowDownLeft, ArrowUpRight, Gift, Users, FileText, ExternalLink } from 'lucide-react';

function renderIconForType(type: Transaction['type'], className: string) {
  switch (type) {
    case 'send':
      return <ArrowUpRight className={className} />;
    case 'receive':
      return <ArrowDownLeft className={className} />;
    case 'tip':
      return <Gift className={className} />;
    case 'payment_request':
      return <FileText className={className} />;
    case 'group_payment':
      return <Users className={className} />;
    default:
      return <ArrowUpRight className={className} />;
  }
}

function _getStatusIcon(status: Transaction['status']) {
  switch (status) {
    case 'confirmed':
      return Check;
    case 'pending':
      return Clock;
    case 'failed':
      return XCircle;
    default:
      return Clock;
  }
}

function getTransactionLabel(type: Transaction['type'], isSent: boolean): string {
  switch (type) {
    case 'tip':
      return isSent ? 'Tip Sent' : 'Tip Received';
    case 'payment_request':
      return 'Payment Request';
    case 'group_payment':
      return 'Group Payment';
    default:
      return isSent ? 'Sent' : 'Received';
  }
}

function getStatusColor(status: Transaction['status']): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-500/10 text-green-400';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'failed':
      return 'bg-red-500/10 text-red-400';
    default:
      return 'bg-gray-500/10 text-gray-400';
  }
}

// Imported from canonical source

