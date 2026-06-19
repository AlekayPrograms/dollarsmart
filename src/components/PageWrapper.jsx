// src/components/PageWrapper.jsx
import { motion } from 'framer-motion'
import { fade, spring } from '../lib/motion.js'

export default function PageWrapper({ children, className = 'page-root', style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={fade.initial}
      animate={fade.animate}
      exit={fade.exit}
      transition={spring.smooth}
    >
      {children}
    </motion.div>
  )
}
