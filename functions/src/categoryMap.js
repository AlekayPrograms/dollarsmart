// Maps a Plaid transaction to one of DollarSmart's 10 category ids.
// Strategy: try keyword match on the merchant name first (most specific),
// then fall back to Plaid's personal_finance_category.primary, then 'other'.

const NAME_KEYWORDS = [
  ['groceries', ['safeway', 'trader joe', 'whole foods', 'kroger', 'aldi', 'wegmans', 'grocery', 'supermarket']],
  ['food', ['chipotle', 'starbucks', 'mcdonald', 'restaurant', 'cafe', 'coffee', 'pizza', 'doordash', 'grubhub', 'uber eats']],
  ['transport', ['uber', 'lyft', 'shell', 'exxon', 'chevron', 'bp ', 'gas', 'parking', 'metro', 'transit']],
  ['shopping', ['amazon', 'target', 'walmart', 'best buy', 'etsy', 'ebay']],
  ['entertainment', ['netflix', 'spotify', 'hulu', 'steam', 'playstation', 'xbox', 'cinema', 'movie']],
  ['bills', ['comcast', 'verizon', 'at&t', 'electric', 'water', 'utility', 'insurance']],
  ['health', ['cvs', 'walgreens', 'pharmacy', 'clinic', 'hospital', 'dental']],
  ['travel', ['airline', 'hotel', 'airbnb', 'delta', 'united', 'marriott', 'expedia']],
  ['pets', ['petco', 'petsmart', 'chewy', 'veterinary', 'vet ']],
]

const PLAID_PRIMARY_MAP = {
  FOOD_AND_DRINK: 'food',
  GENERAL_MERCHANDISE: 'shopping',
  TRANSPORTATION: 'transport',
  TRAVEL: 'travel',
  ENTERTAINMENT: 'entertainment',
  RENT_AND_UTILITIES: 'bills',
  MEDICAL: 'health',
  PERSONAL_CARE: 'health',
}

function merchantToCategory(merchantName, plaidPrimary) {
  const name = String(merchantName ?? '').toLowerCase()
  if (name) {
    for (const [categoryId, keywords] of NAME_KEYWORDS) {
      if (keywords.some((kw) => name.includes(kw))) return categoryId
    }
  }
  if (plaidPrimary && PLAID_PRIMARY_MAP[plaidPrimary]) {
    return PLAID_PRIMARY_MAP[plaidPrimary]
  }
  return 'other'
}

module.exports = { merchantToCategory }
