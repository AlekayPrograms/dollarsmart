export const CATEGORIES = [
  { id: 'food', label: 'Food & Drink', emoji: '🍔', color: '#F97316' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒', color: '#22C55E' },
  { id: 'transport', label: 'Transport', emoji: '🚗', color: '#3B82F6' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#A855F7' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎮', color: '#EC4899' },
  { id: 'bills', label: 'Bills & Utilities', emoji: '💡', color: '#EAB308' },
  { id: 'health', label: 'Health', emoji: '💊', color: '#14B8A6' },
  { id: 'travel', label: 'Travel', emoji: '✈️', color: '#0EA5E9' },
  { id: 'pets', label: 'Pets', emoji: '🐾', color: '#A16207' },
  { id: 'other', label: 'Other', emoji: '📦', color: '#6B7280' },
]

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.find((c) => c.id === 'other')
}
