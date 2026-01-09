'use client';

import React from 'react';
import { SocialTipButton } from './SocialTipButton';

/**
 * SocialPaymentButton - Unified payment interface for social interactions
 * Wraps SocialTipButton with consistent API
 */

interface SocialPaymentButtonProps {
  recipientAddress: string;
  recipientName: string;
  contentId: string;
  className?: string;
}

export function SocialPaymentButton({
  recipientAddress,
  recipientName,
  contentId,
  className = '',
}: SocialPaymentButtonProps) {
  return (
    <SocialTipButton
      postId={contentId}
      recipientAddress={recipientAddress}
      recipientName={recipientName}
      className={className}
    />
  );
}
