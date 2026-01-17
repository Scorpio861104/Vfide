/**
 * Customer Reviews System
 * 
 * Allows customers to leave reviews for merchants and products
 * Builds trust and provides social proof for the ecosystem
 */

export interface Review {
  id: string;
  merchantAddress: string;
  customerAddress: string;
  productId?: string;
  rating: number; // 1-5 stars
  title: string;
  comment: string;
  verified: boolean; // Verified purchase
  helpful: number; // Helpful votes
  timestamp: Date;
  response?: MerchantResponse;
}

export interface MerchantResponse {
  text: string;
  timestamp: Date;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  verifiedPurchasePercentage: number;
  responseRate: number; // Percentage of reviews responded to
}

export interface ReviewFilters {
  rating?: number;
  verified?: boolean;
  hasResponse?: boolean;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

/**
 * Submit a review for a merchant
 */
export async function submitReview(
  customerAddress: string,
  merchantAddress: string,
  review: {
    productId?: string;
    rating: number;
    title: string;
    comment: string;
  }
): Promise<{ success: boolean; reviewId?: string; message: string }> {
  try {
    // Validate rating
    if (review.rating < 1 || review.rating > 5) {
      return {
        success: false,
        message: 'Rating must be between 1 and 5 stars',
      };
    }

    // Validate title and comment
    if (!review.title || review.title.length < 3) {
      return {
        success: false,
        message: 'Title must be at least 3 characters',
      };
    }

    if (!review.comment || review.comment.length < 10) {
      return {
        success: false,
        message: 'Comment must be at least 10 characters',
      };
    }

    // Check if customer has made a verified purchase
    const hasVerifiedPurchase = await checkVerifiedPurchase(
      customerAddress,
      merchantAddress,
      review.productId
    );

    // TODO: Save review to database
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    console.log('Review submitted:', {
      reviewId,
      customerAddress,
      merchantAddress,
      verified: hasVerifiedPurchase,
      ...review,
    });

    return {
      success: true,
      reviewId,
      message: 'Review submitted successfully',
    };
  } catch (error) {
    console.error('Error submitting review:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit review',
    };
  }
}

/**
 * Get reviews for a merchant
 */
export async function getReviews(
  merchantAddress: string,
  filters: ReviewFilters = {},
  page: number = 1,
  limit: number = 10
): Promise<{ reviews: Review[]; total: number; hasMore: boolean }> {
  // TODO: Fetch from database with filters
  // For now, return mock data
  const mockReviews: Review[] = generateMockReviews(merchantAddress);

  // Apply filters
  let filteredReviews = [...mockReviews];

  if (filters.rating) {
    filteredReviews = filteredReviews.filter((r) => r.rating === filters.rating);
  }

  if (filters.verified !== undefined) {
    filteredReviews = filteredReviews.filter((r) => r.verified === filters.verified);
  }

  if (filters.hasResponse !== undefined) {
    filteredReviews = filteredReviews.filter((r) => 
      filters.hasResponse ? !!r.response : !r.response
    );
  }

  // Sort reviews
  switch (filters.sortBy) {
    case 'newest':
      filteredReviews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      break;
    case 'oldest':
      filteredReviews.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      break;
    case 'highest':
      filteredReviews.sort((a, b) => b.rating - a.rating);
      break;
    case 'lowest':
      filteredReviews.sort((a, b) => a.rating - b.rating);
      break;
    case 'helpful':
      filteredReviews.sort((a, b) => b.helpful - a.helpful);
      break;
    default:
      filteredReviews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedReviews = filteredReviews.slice(start, end);

  return {
    reviews: paginatedReviews,
    total: filteredReviews.length,
    hasMore: end < filteredReviews.length,
  };
}

/**
 * Get review statistics for a merchant
 */
export async function getReviewStats(merchantAddress: string): Promise<ReviewStats> {
  // TODO: Calculate from database
  // For now, return mock data
  return {
    averageRating: 4.3,
    totalReviews: 248,
    ratingDistribution: {
      5: 132,
      4: 76,
      3: 28,
      2: 8,
      1: 4,
    },
    verifiedPurchasePercentage: 87.5,
    responseRate: 68.2,
  };
}

/**
 * Merchant responds to a review
 */
export async function respondToReview(
  merchantAddress: string,
  reviewId: string,
  responseText: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!responseText || responseText.length < 10) {
      return {
        success: false,
        message: 'Response must be at least 10 characters',
      };
    }

    // TODO: Save response to database
    console.log('Merchant response saved:', {
      merchantAddress,
      reviewId,
      responseText,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Response posted successfully',
    };
  } catch (error) {
    console.error('Error responding to review:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to post response',
    };
  }
}

/**
 * Mark review as helpful
 */
export async function markReviewHelpful(
  customerAddress: string,
  reviewId: string
): Promise<{ success: boolean; newHelpfulCount: number }> {
  try {
    // TODO: Update database
    // Check if customer already marked as helpful
    const mockNewCount = Math.floor(Math.random() * 20) + 1;

    return {
      success: true,
      newHelpfulCount: mockNewCount,
    };
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    return {
      success: false,
      newHelpfulCount: 0,
    };
  }
}

/**
 * Check if customer has made a verified purchase
 */
async function checkVerifiedPurchase(
  customerAddress: string,
  merchantAddress: string,
  productId?: string
): Promise<boolean> {
  // TODO: Check transaction history on-chain
  // For now, return mock verification
  return Math.random() > 0.3; // 70% verified
}

/**
 * Generate mock reviews for testing
 */
function generateMockReviews(merchantAddress: string): Review[] {
  const reviews: Review[] = [];
  const sampleTitles = [
    'Great service!',
    'Highly recommended',
    'Fast and reliable',
    'Excellent communication',
    'Professional seller',
    'Could be better',
    'Amazing experience',
    'Will buy again',
  ];

  const sampleComments = [
    'Very satisfied with my purchase. The merchant was responsive and delivered exactly what was promised.',
    'Fast shipping and great quality. Highly recommend this seller to anyone looking for reliable service.',
    'Good experience overall. There were minor delays but the merchant communicated well.',
    'Outstanding service! The merchant went above and beyond to ensure I was satisfied.',
    'Average experience. Product met expectations but nothing special.',
    'Excellent communication throughout the process. Very professional and trustworthy.',
    'Quick transaction and no issues. Would definitely purchase from this merchant again.',
    'The merchant was helpful in answering all my questions. Smooth transaction.',
  ];

  for (let i = 0; i < 15; i++) {
    const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars mostly
    const hasResponse = Math.random() > 0.4;

    // Generate mock Ethereum address (40 hex chars + 0x prefix = 42 total)
    const mockAddress = `0x${Math.random().toString(16).slice(2).padEnd(40, '0')}`;

    reviews.push({
      id: `review_${i}`,
      merchantAddress,
      customerAddress: mockAddress,
      rating,
      title: sampleTitles[Math.floor(Math.random() * sampleTitles.length)],
      comment: sampleComments[Math.floor(Math.random() * sampleComments.length)],
      verified: Math.random() > 0.2, // 80% verified
      helpful: Math.floor(Math.random() * 25),
      timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
      response: hasResponse
        ? {
            text: 'Thank you for your feedback! We appreciate your business and look forward to serving you again.',
            timestamp: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          }
        : undefined,
    });
  }

  return reviews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Report inappropriate review
 */
export async function reportReview(
  reporterAddress: string,
  reviewId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!reason || reason.length < 10) {
      return {
        success: false,
        message: 'Please provide a detailed reason for reporting',
      };
    }

    // TODO: Save report to database for moderation
    console.log('Review reported:', {
      reporterAddress,
      reviewId,
      reason,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Review reported successfully. Our team will review it shortly.',
    };
  } catch (error) {
    console.error('Error reporting review:', error);
    return {
      success: false,
      message: 'Failed to report review',
    };
  }
}

/**
 * Get review summary for display
 */
export function getReviewSummary(stats: ReviewStats): string {
  const { averageRating, totalReviews } = stats;
  
  if (totalReviews === 0) {
    return 'No reviews yet';
  }

  const stars = '⭐'.repeat(Math.round(averageRating));
  return `${averageRating.toFixed(1)} ${stars} (${totalReviews} reviews)`;
}
