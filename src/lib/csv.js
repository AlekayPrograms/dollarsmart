const HEADER = 'date,type,amount,category,note,pool'

function toIsoDate(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function expensesToCsv(expenses) {
  const rows = [HEADER]
  for (const e of expenses) {
    rows.push([
      toIsoDate(e.date),
      e.type,
      e.amount.toFixed(2),
      e.categoryId,
      escapeCsv(e.note),
      e.poolType,
    ].join(','))
  }
  return rows.join('\n')
}
