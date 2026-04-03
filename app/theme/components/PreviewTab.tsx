'use client';

export function PreviewTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Live Preview</h3>
        <p className="text-gray-400">Use this panel to sanity-check how headings, cards, and buttons will feel before saving a theme.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Heading sample</p>
          <h4 className="mt-2 text-2xl font-bold text-white">Payments at a glance</h4>
          <p className="mt-2 text-sm text-gray-400">Preview how core marketing and dashboard typography will render in your selected theme.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="mb-3 text-sm font-semibold text-white">Action sample</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-zinc-950">Primary</button>
            <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">Secondary</button>
          </div>
        </div>
      </div>
    </div>
  );
}
