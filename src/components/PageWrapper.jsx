// src/components/PageWrapper.jsx
// Plain wrapper — tab/page changes are instant (no fade transition).
export default function PageWrapper({ children, className = 'page-root', style }) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
