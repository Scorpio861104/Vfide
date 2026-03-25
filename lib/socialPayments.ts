/**
 * Social Payments Integration
 * 
 * Seamlessly blend cryptocurrency payments with social interactions.
 * Users can tip posts, pay for content, reward endorsements, and more.
 */

import { useCallback, useEffect, useState } from 'react';
import { sendPayment } from './crypto';
import { validateAmount, validateEthereumAddress } from './cryptoValidation';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface SocialTip {
  id: string;
  postId?: string;
  commentId?: string;
  recipientAddress: string;
  amount: string;
  currency: 'ETH' | 'VFIDE';
  message?: string;
  timestamp: number;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface ContentPayment {
  id: string;
  contentId: string;
  contentType: 'post' | 'article' | 'premium_content' | 'group_access';
  price: string;
  currency: 'ETH' | 'VFIDE';
  sellerAddress: string;
  buyerAddress: string;
  timestamp: number;
  txHash?: string;
  accessGranted: boolean;
}

export interface SocialPaymentStats {
  totalTipsReceived: string;
  totalTipsSent: string;
  contentSales: number;
  topTippers: Array<{
    address: string;
    username: string;
    amount: string;
  }>;
  recentActivity: Array<SocialTip | ContentPayment>;
}

// ============================================================================
// Social Tipping
// ============================================================================

/**
 * Tip a social post
 */
export async function tipPost(
  postId: string,
  recipientAddress: string,
  amount: string,
  currency: 'ETH' | 'VFIDE',
  message?: string
): Promise<SocialTip> {
  // Validate inputs
  validateAmount(amount);
  validateEthereumAddress(recipientAddress);

  try {
    // Send payment
    const transaction = await sendPayment(recipientAddress, amount, currency, {
      memo: message || `Tip for post ${postId}`,
    });

    const tip: SocialTip = {
      id: `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      recipientAddress,
      amount,
      currency,
      message,
      timestamp: Date.now(),
      txHash: transaction.txHash,
      status: transaction.status === 'confirmed' ? 'confirmed' : 'pending',
    };

    // Save tip to database
    await fetch('/api/social/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tip),
    });

    // Notify recipient
    await notifyTipReceived(tip);

    return tip;
  } catch (error) {
    logger.error('Tip error:', error);
    throw new Error('Failed to send tip');
  }
}

/**
 * Tip a comment
 */
export async function tipComment(
  commentId: string,
  recipientAddress: string,
  amount: string,
  currency: 'ETH' | 'VFIDE',
  message?: string
): Promise<SocialTip> {
  validateAmount(amount);
  validateEthereumAddress(recipientAddress);

  try {
    const transaction = await sendPayment(recipientAddress, amount, currency, {
      memo: message || `Tip for comment ${commentId}`,
    });

    const tip: SocialTip = {
      id: `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      commentId,
      recipientAddress,
      amount,
      currency,
      message,
      timestamp: Date.now(),
      txHash: transaction.txHash,
      status: transaction.status === 'confirmed' ? 'confirmed' : 'pending',
    };

    await fetch('/api/social/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tip),
    });

    await notifyTipReceived(tip);

    return tip;
  } catch (error) {
    logger.error('Tip error:', error);
    throw new Error('Failed to send tip');
  }
}

// ============================================================================
// Premium Content Payments
// ============================================================================

/**
 * Purchase access to premium content
 */
export async function purchaseContent(
  contentId: string,
  contentType: ContentPayment['contentType'],
  price: string,
  currency: 'ETH' | 'VFIDE',
  sellerAddress: string
): Promise<ContentPayment> {
  validateAmount(price);
  validateEthereumAddress(sellerAddress);

  try {
    // Send payment
    const transaction = await sendPayment(sellerAddress, price, currency, {
      memo: `Purchase ${contentType}: ${contentId}`,
    });

    const payment: ContentPayment = {
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId,
      contentType,
      price,
      currency,
      sellerAddress,
      buyerAddress: transaction.from,
      timestamp: Date.now(),
      txHash: transaction.txHash,
      accessGranted: false,
    };

    // Save payment and grant access
    const response = await fetch('/api/social/content-purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });

    const data = await response.json();
    payment.accessGranted = data.accessGranted;

    // Notify seller
    await notifyContentPurchase(payment);

    return payment;
  } catch (error) {
    logger.error('Content purchase error:', error);
    throw new Error('Failed to purchase content');
  }
}

/**
 * Check if user has access to premium content
 */
export async function hasContentAccess(
  contentId: string,
  userAddress: string
): Promise<boolean> {
  const response = await fetch(
    `/api/social/content-access?contentId=${contentId}&userAddress=${userAddress}`
  );
  const data = await response.json();
  return data.hasAccess;
}

// ============================================================================
// Statistics & Analytics
// ============================================================================

/**
 * Get social payment statistics for a user
 */
export async function getSocialPaymentStats(
  userAddress: string
): Promise<SocialPaymentStats> {
  const response = await fetch(`/api/social/payment-stats/${userAddress}`);
  const data = await response.json();
  return data.stats;
}

/**
 * Get tips received for a post
 */
export async function getPostTips(postId: string): Promise<SocialTip[]> {
  const response = await fetch(`/api/social/tips?postId=${postId}`);
  const data = await response.json();
  return data.tips;
}

/**
 * Get total tips received for a post
 */
export async function getPostTipTotal(postId: string): Promise<{ eth: string; vfide: string }> {
  const tips = await getPostTips(postId);
  
  const totals = tips.reduce(
    (acc, tip) => {
      if (tip.status === 'confirmed') {
        if (tip.currency === 'ETH') {
          acc.eth = (parseFloat(acc.eth) + parseFloat(tip.amount)).toString();
        } else {
          acc.vfide = (parseFloat(acc.vfide) + parseFloat(tip.amount)).toString();
        }
      }
      return acc;
    },
    { eth: '0', vfide: '0' }
  );

  return totals;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function notifyTipReceived(tip: SocialTip): Promise<void> {
  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'tip_received',
      userId: tip.recipientAddress,
      data: tip,
    }),
  });
}

async function notifyContentPurchase(payment: ContentPayment): Promise<void> {
  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'content_purchased',
      userId: payment.sellerAddress,
      data: payment,
    }),
  });
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for tipping functionality
 */
export function useTipping(postId?: string, commentId?: string) {
  const [tips, setTips] = useState<SocialTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState({ eth: '0', vfide: '0' });

  const loadPostTips = useCallback(async () => {
    if (!postId) return;
    
    try {
      const [tipsData, totalsData] = await Promise.all([
        getPostTips(postId),
        getPostTipTotal(postId),
      ]);
      setTips(tipsData);
      setTotal(totalsData);
    } catch (error) {
      logger.error('Failed to load tips:', error);
    }
  }, [postId]);

  const sendTip = useCallback(
    async (recipientAddress: string, amount: string, currency: 'ETH' | 'VFIDE', message?: string) => {
      setIsLoading(true);
      try {
        let tip: SocialTip;
        if (postId) {
          tip = await tipPost(postId, recipientAddress, amount, currency, message);
        } else if (commentId) {
          tip = await tipComment(commentId, recipientAddress, amount, currency, message);
        } else {
          throw new Error('No post or comment ID provided');
        }
        
        setTips((prev) => [tip, ...prev]);
        await loadPostTips();
        return tip;
      } catch (error) {
        logger.error('Failed to send tip:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [postId, commentId, loadPostTips]
  );

  return {
    tips,
    total,
    isLoading,
    sendTip,
    refresh: loadPostTips,
  };
}

/**
 * Hook for premium content
 */
export function usePremiumContent(contentId: string, userAddress?: string) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!userAddress) {
      setHasAccess(false);
      setIsChecking(false);
      return;
    }

    try {
      const access = await hasContentAccess(contentId, userAddress);
      setHasAccess(access);
    } catch (error) {
      logger.error('Failed to check access:', error);
    } finally {
      setIsChecking(false);
    }
  }, [contentId, userAddress]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const purchase = useCallback(
    async (
      contentType: ContentPayment['contentType'],
      price: string,
      currency: 'ETH' | 'VFIDE',
      sellerAddress: string
    ) => {
      setIsPurchasing(true);
      try {
        const payment = await purchaseContent(
          contentId,
          contentType,
          price,
          currency,
          sellerAddress
        );
        setHasAccess(payment.accessGranted);
        return payment;
      } catch (error) {
        logger.error('Failed to purchase content:', error);
        throw error;
      } finally {
        setIsPurchasing(false);
      }
    },
    [contentId]
  );

  return {
    hasAccess,
    isChecking,
    isPurchasing,
    purchase,
    refresh: checkAccess,
  };
}

/**
 * Hook for social payment stats
 */
export function useSocialPaymentStats(userAddress?: string) {
  const [stats, setStats] = useState<SocialPaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!userAddress) return;

    try {
      const data = await getSocialPaymentStats(userAddress);
      setStats(data);
    } catch (error) {
      logger.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      loadStats();
    }
  }, [userAddress, loadStats]);

  return {
    stats,
    isLoading,
    refresh: loadStats,
  };
}
