/**
 * Social Payments Integration
 * 
 * Seamlessly blend cryptocurrency payments with social interactions.
 * Users can tip posts, pay for content, reward endorsements, and more.
 */

import { useCallback, useEffect, useState } from 'react';
import { sendPayment } from './crypto';
import { validateAmount, validateEthereumAddress } from './cryptoValidation';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';
import { secureId } from '@/lib/secureRandom';

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

export interface EndorsementReward {
  id: string;
  endorsementId: string;
  senderAddress: string;
  recipientAddress: string;
  amount: string;
  currency: 'VFIDE';
  category: 'technical' | 'trustworthy' | 'helpful' | 'innovative' | 'collaborative';
  timestamp: number;
  txHash?: string;
}

export interface SocialPaymentStats {
  totalTipsReceived: string;
  totalTipsSent: string;
  contentSales: number;
  endorsementRewards: number;
  topTippers: Array<{
    address: string;
    username: string;
    amount: string;
  }>;
  recentActivity: Array<SocialTip | ContentPayment | EndorsementReward>;
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
      id: secureId('tip'),
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
    const tipHeaders = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    await fetch('/api/social/tips', {
      method: 'POST',
      headers: tipHeaders,
      credentials: 'include',
      body: JSON.stringify(tip),
    });

    // Notify recipient
    await notifyTipReceived(tip);

    return tip;
  } catch (error) {
    console.error('Tip error:', error);
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
      id: secureId('tip'),
      commentId,
      recipientAddress,
      amount,
      currency,
      message,
      timestamp: Date.now(),
      txHash: transaction.txHash,
      status: transaction.status === 'confirmed' ? 'confirmed' : 'pending',
    };

    const tipHeaders = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    await fetch('/api/social/tips', {
      method: 'POST',
      headers: tipHeaders,
      credentials: 'include',
      body: JSON.stringify(tip),
    });

    await notifyTipReceived(tip);

    return tip;
  } catch (error) {
    console.error('Tip error:', error);
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
      id: secureId('content'),
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
    const purchaseHeaders = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    const response = await fetch('/api/social/content-purchases', {
      method: 'POST',
      headers: purchaseHeaders,
      credentials: 'include',
      body: JSON.stringify(payment),
    });

    const data = await response.json();
    payment.accessGranted = data.accessGranted;

    // Notify seller
    await notifyContentPurchase(payment);

    return payment;
  } catch (error) {
    console.error('Content purchase error:', error);
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
// Endorsement Rewards
// ============================================================================

/**
 * Send VFIDE tokens as endorsement reward
 */
export async function rewardEndorsement(
  endorsementId: string,
  recipientAddress: string,
  amount: string,
  category: EndorsementReward['category']
): Promise<EndorsementReward> {
  validateAmount(amount);
  validateEthereumAddress(recipientAddress);

  try {
    const transaction = await sendPayment(recipientAddress, amount, 'VFIDE', {
      memo: `Endorsement reward: ${category}`,
    });

    const reward: EndorsementReward = {
      id: secureId('reward'),
      endorsementId,
      senderAddress: transaction.from,
      recipientAddress,
      amount,
      currency: 'VFIDE',
      category,
      timestamp: Date.now(),
      txHash: transaction.txHash,
    };

    const rewardHeaders = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    await fetch('/api/social/endorsement-rewards', {
      method: 'POST',
      headers: rewardHeaders,
      credentials: 'include',
      body: JSON.stringify(reward),
    });

    await notifyEndorsementReward(reward);

    return reward;
  } catch (error) {
    console.error('Endorsement reward error:', error);
    throw new Error('Failed to send endorsement reward');
  }
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
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
  await fetch('/api/notifications', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      type: 'tip_received',
      userId: tip.recipientAddress,
      data: tip,
    }),
  });
}

async function notifyContentPurchase(payment: ContentPayment): Promise<void> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
  await fetch('/api/notifications', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      type: 'content_purchased',
      userId: payment.sellerAddress,
      data: payment,
    }),
  });
}

async function notifyEndorsementReward(reward: EndorsementReward): Promise<void> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
  await fetch('/api/notifications', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      type: 'endorsement_reward',
      userId: reward.recipientAddress,
      data: reward,
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
      console.error('Failed to load tips:', error);
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
        console.error('Failed to send tip:', error);
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
      console.error('Failed to check access:', error);
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
        console.error('Failed to purchase content:', error);
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
      console.error('Failed to load stats:', error);
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
