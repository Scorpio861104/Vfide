'use client';

/**
 * Backward-compatible alias for the consolidated notification center.
 * This keeps the legacy import path working while all consumers share
 * the same actively maintained UI implementation.
 */

export { NotificationCenter, NotificationCenter as default } from '@/components/ui/NotificationCenter';
