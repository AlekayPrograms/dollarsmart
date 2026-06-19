// src/components/ui/Sheet.jsx
import { motion, AnimatePresence } from 'framer-motion'

export default function Sheet({ open, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose() }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
              maxHeight: '90dvh',
              background: 'var(--bg)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              display: 'flex', flexDirection: 'column',
              maxWidth: 480, margin: '0 auto',
              boxShadow: 'var(--shadow-sheet)',
            }}
          >
            {/* drag handle */}
            <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            {title && (
              <div style={{ padding: '0.75rem 1rem 0', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>{title}</h3>
              </div>
            )}

            {/* scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem 1rem' }}>
              {children}
            </div>

            {/* pinned footer — always visible, never hidden by keyboard or viewport */}
            {footer && (
              <div style={{
                flexShrink: 0,
                padding: '0.75rem 1rem',
                paddingBottom: 'calc(0.75rem + var(--safe-bottom))',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg)',
              }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
