'use client';

// Extracted from app/support/page.tsx — tab 'new'
// TODO: Move the 'new' tab content here and verify imports

export function NewTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">New Ticket</h3>
        <p className="text-gray-400">Content from SupportPage</p>
      </div>
    </div>
  );
}
