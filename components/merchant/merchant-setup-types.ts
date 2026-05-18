export interface QuickProduct {
  id: string;
  name: string;
  price: string;
  description: string;
  imagePreview: string | null;
  imageFile: File | null;
}

export type Step = 1 | 2 | 3;

export const CATEGORIES = [
  { value: 'food', label: 'Food & Beverages', emoji: '🍽️' },
  { value: 'clothing', label: 'Clothing & Fashion', emoji: '👗' },
  { value: 'crafts', label: 'Crafts & Handmade', emoji: '🎨' },
  { value: 'agriculture', label: 'Agriculture & Farming', emoji: '🌾' },
  { value: 'electronics', label: 'Electronics & Tech', emoji: '📱' },
  { value: 'services', label: 'Services', emoji: '✂️' },
  { value: 'beauty', label: 'Beauty & Health', emoji: '💅' },
  { value: 'general', label: 'General Store', emoji: '🏪' },
];

export function generateId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 200);
}
