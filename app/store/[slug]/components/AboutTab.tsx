'use client';

const ABOUT_SECTIONS = [
  {
    title: 'Store story',
    detail: 'Merchant bios, mission statements, and operating notes can be published here for public storefront visitors.',
  },
  {
    title: 'Fulfilment details',
    detail: 'Shipping, pickup, digital delivery, and service coverage details belong in this section once configured.',
  },
  {
    title: 'Support channels',
    detail: 'Contact links, response expectations, and business hours can be shared here for trust and transparency.',
  },
];

export function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">About This Store</h3>
        <p className="text-gray-400">The merchant has not filled out their public profile yet, so this storefront is currently operating in preview mode.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ABOUT_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h4 className="mb-2 font-semibold text-white">{section.title}</h4>
            <p className="text-sm text-gray-400">{section.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
