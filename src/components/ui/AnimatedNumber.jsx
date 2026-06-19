// src/components/ui/AnimatedNumber.jsx
import { useEffect, useRef } from 'react'
import { useMotionValue, animate } from 'framer-motion'

export default function AnimatedNumber({ value, prefix = '', decimals = 0, style = {} }) {
  const motionVal = useMotionValue(value)
  const ref = useRef(null)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = prefix + v.toFixed(decimals)
        }
      },
    })
    return controls.stop
  }, [value, prefix, decimals])

  return (
    <span ref={ref} style={style}>
      {prefix}{value.toFixed(decimals)}
    </span>
  )
}
