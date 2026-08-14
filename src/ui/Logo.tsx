// Logomarca oficial do Gestor Arena — "A" geométrico em gradiente ciano→azul→navy.
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden role="img">
      <defs>
        <linearGradient id="ga-mark" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.55" stopColor="#1769FF" />
          <stop offset="1" stopColor="#071C36" />
        </linearGradient>
      </defs>
      {/* chevron que forma o A */}
      <path d="M20 4 L35 35 H27.5 L20 19 L12.5 35 H5 Z" fill="url(#ga-mark)" />
      {/* travessão do A */}
      <rect x="14.5" y="26.5" width="11" height="3.6" rx="1" fill="#38BDF8" />
    </svg>
  )
}

// Logo completo (marca + wordmark) para sidebar e login.
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="ga-logo" style={{ gap: 10 }}>
      <LogoMark size={size} />
      <b style={{ letterSpacing: '.02em', lineHeight: 1 }}>
        GESTOR <span style={{ color: 'var(--brand)' }}>ARENA</span>
      </b>
    </span>
  )
}
