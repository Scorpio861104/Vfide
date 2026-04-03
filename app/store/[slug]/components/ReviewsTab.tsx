'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original store/[slug] page

export function ReviewsTab() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
  {reviews.length === 0 ? (
    <p className="text-gray-500 py-8 text-center">No reviews yet</p>
  ) : (
    <div className="space-y-4">
    {reviews.map(review => (
    <div key={review.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-2">
    <div className="flex">
    {[1, 2, 3, 4, 5].map(s => (
    <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
    ))}
    </div>
    <span className="text-xs text-gray-400">
    {new Date(review.created_at).toLocaleDateString()}
    </span>
    </div>
    {review.title && <h4 className="font-semibold text-gray-900 dark:text-white">{review.title}</h4>}
    {review.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{review.body}</p>}
    <p className="text-xs text-gray-400 mt-2">
    {review.reviewer_address.slice(0, 6)}...{review.reviewer_address.slice(-4)}
    </p>
    {review.merchant_reply && (
    <div className="mt-3 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Merchant Reply</p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{review.merchant_reply}</p>
    </div>
    )}
    </div>
    ))}
    </div>
  )}
  </div>
    </div>
  );
}
