'use client';

// Extracted from app/store/[slug]/page.tsx — tab 'about'
// TODO: Move the 'about' tab content here and verify imports

export function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">About</h3>
        <p className="text-gray-400">Content from StorefrontPage</p>
      </div>
    </div>
  );
}
