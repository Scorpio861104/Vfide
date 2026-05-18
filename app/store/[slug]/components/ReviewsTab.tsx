'use client';

const REVIEW_STANDARDS = [
  'Only completed or verified purchases should produce public reviews.',
  'Merchants can reply for context, but original customer feedback should remain intact.',
  'Ratings become more useful as repeat customers and order volume grow over time.',
];

export function ReviewsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Customer Reviews</h3>
        <p className="text-gray-400">No published reviews yet. Verified feedback will appear here once orders begin settling.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <h4 className="mb-3 font-semibold text-white">Review standards</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          {REVIEW_STANDARDS.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
