'use client';

const PRODUCT_GROUPS = [
  {
    title: 'Physical goods',
    detail: 'Merchants can publish inventory-backed items with shipping or pickup fulfilment.',
  },
  {
    title: 'Digital goods',
    detail: 'Download links, licenses, and access keys can be delivered after verified payment.',
  },
  {
    title: 'Services',
    detail: 'Service listings can pair storefront discovery with invoices, bookings, or recurring payments.',
  },
];

export function ProductsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Catalog Preview</h3>
        <p className="text-gray-400">
          This merchant has not published a live product catalog yet. When inventory is available, listings will appear here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PRODUCT_GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h4 className="mb-2 font-semibold text-white">{group.title}</h4>
            <p className="text-sm text-gray-400">{group.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
