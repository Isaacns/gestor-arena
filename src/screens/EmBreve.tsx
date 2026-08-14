// Tela on-brand para módulos que estão no menu (igual ao mockup) e serão implementados nas próximas ondas.
export default function EmBreve({ ico, titulo, descricao, itens }: {
  ico: string; titulo: string; descricao: string; itens: string[]
}) {
  return (
    <div className="ga-card" style={{ maxWidth: 640, padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 24, background: 'linear-gradient(135deg, var(--brand), var(--navy))' }} aria-hidden>{ico}</span>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{titulo}</h2>
          <span className="ga-chip ga-chip-warn" style={{ marginTop: 4, display: 'inline-flex' }}>Em construção</span>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--tx2)', margin: '0 0 16px', lineHeight: 1.6 }}>{descricao}</p>
      <div style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>O que este módulo vai fazer</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        {itens.map((t, i) => <li key={i} style={{ fontSize: 14, color: 'var(--tx)' }}>{t}</li>)}
      </ul>
    </div>
  )
}
