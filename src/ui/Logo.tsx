// Logomarca oficial do Gestor Arena — marca "A" de fita, extraída do mockup oficial (web/public/logo-mark.png).
export function LogoMark({ size = 34 }: { size?: number }) {
  return <img src="/logo-mark.png" width={size} height={size} alt="Gestor Arena" style={{ display: 'block', objectFit: 'contain' }} />
}

// Logo completo (marca + wordmark) para sidebar e login. "GESTOR" herda a cor do contexto; "ARENA" no azul da marca.
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <b style={{ letterSpacing: '.02em', lineHeight: 1, fontWeight: 800, fontSize: size * 0.46 }}>
        GESTOR <span style={{ color: 'var(--brand)' }}>ARENA</span>
      </b>
    </span>
  )
}
