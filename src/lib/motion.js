// src/lib/motion.js
export const spring = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  smooth: { type: 'spring', stiffness: 260, damping: 28 },
  gentle: { type: 'spring', stiffness: 180, damping: 24 },
  swipe:  { type: 'spring', stiffness: 500, damping: 40 },
}

export const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
}

export const slideRight = {
  initial: { x: 30, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { x: -20, opacity: 0 },
}

export const slideLeft = {
  initial: { x: -30, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { x: 20, opacity: 0 },
}
