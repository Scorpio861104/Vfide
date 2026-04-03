'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ReviewsSection({ merchantAddress }: { merchantAddress: string }) {
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; title: string | null; body: string | null; reviewer_address: string; merchant_reply: string | null; created_at: string; product_name?: string }>>([]);
  const [stats, setStats] = useState<{ avg_rating: number; total_reviews: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/merchant/reviews?merchant=${encodeURIComponent(merchantAddress)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.reviews) setReviews(d.reviews);
        if (d?.stats) setStats(d.stats);
      })
      .finally(() => setLoading(false));
  }, [merchantAddress]);

  const submitReply = async (reviewId: string) => {
    const reply = replyText[reviewId];
    if (!reply?.trim()) return;
    const res = await fetch('/api/merchant/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, merchant_reply: reply }),
    });
    if (res.ok) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, merchant_reply: reply } : r));
      setReplyText(prev => { const n = { ...prev }; delete n[reviewId]; return n; });
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading reviews...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reviews</h3>
        {stats && (
          <span className="text-sm text-gray-500">
            ★ {stats.avg_rating.toFixed(1)} · {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={s <= review.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>)}</div>
              <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
            </div>
            {review.title && <p className="font-medium text-gray-900 dark:text-white text-sm">{review.title}</p>}
            {review.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{review.body}</p>}
            <p className="text-xs text-gray-400 mt-1">{review.reviewer_address.slice(0, 6)}...{review.reviewer_address.slice(-4)}</p>
            {review.merchant_reply ? (
              <div className="mt-2 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Your Reply</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{review.merchant_reply}</p>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  placeholder="Write a reply..."
                  value={replyText[review.id] || ''}
                  onChange={e => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                  className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button onClick={() => submitReply(review.id)} className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Reply</button>
              </div>
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-center text-gray-400 py-4">No reviews yet</p>}
      </div>
    </div>
  );
}
