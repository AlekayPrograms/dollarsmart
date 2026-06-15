import { CATEGORIES } from '../lib/categories.js'

export default function CategoryGrid({ selected, onSelect }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem',
      width: '100%', maxWidth: 360,
    }}>
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
              padding: '0.5rem 0.25rem', borderRadius: 12, cursor: 'pointer',
              background: isSelected ? cat.color + 'dd' : 'var(--surface)',
              border: isSelected ? `2px solid ${cat.color}` : '2px solid transparent',
              color: 'var(--text)',
              transition: 'transform 0.1s, background 0.15s',
              transform: isSelected ? 'scale(0.97)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>{cat.emoji}</span>
            <span style={{ fontSize: '0.6rem', textAlign: 'center', color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--muted)' }}>
              {cat.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
