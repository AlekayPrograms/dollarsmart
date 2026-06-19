// src/components/Keypad.jsx
import { motion } from 'framer-motion'
import { spring } from '../lib/motion.js'
import { haptics } from '../lib/haptics.js'

const ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','.']]

export default function Keypad({ onKey }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
      {ROWS.flat().map((k) => (
        <motion.button
          key={k}
          whileTap={{ scale: 0.91 }}
          transition={spring.snappy}
          onClick={() => { haptics.light(); onKey(k) }}
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            height: 43,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: k === '⌫' || k === '.' ? 17 : 20,
            fontWeight: 500,
            color: k === '⌫' ? 'var(--subtle)' : k === '.' ? 'var(--muted)' : 'var(--text)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {k}
        </motion.button>
      ))}
    </div>
  )
}
