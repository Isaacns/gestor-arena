import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { sb } from '../lib/supabase'

function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export default function Dashboard() {
  const { org, user, role } = useAuth()
  const [quadras, setQuadras] = useState<number | null>(null)
  const [reservasHoje, setReservasHoje] = useState<number | null>(null)

  useEffect(() => {
    if (!org) return
    let vivo = true
    ;(async () => {
      const { data: qs } = await sb.rpc('agenda_quadras', { p_org: org.id })
      const ids = (qs ?? []).map((q: { court_id: string }) => q.court_id)
      if (!vivo) return
      setQuadras(ids.length)
      const hoje = new Date().toISOString().slice(0, 10)
      if (ids.length) {
        const { data: rs } = await sb.rpc('agenda_reservas', { p_org: org.id, p_court_ids: ids, p_de: hoje, p_ate: hoje })
        if (vivo) setReservasHoje((rs ?? []).length)
      } else setReservasHoje(0)
    })()
    return () => { vivo = false }
  }, [org])

  const nome = (user?.user_metadata?.nome as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0] ?? 'bem-vindo'
  const ehArena = org?.tipo === 'arena'

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{saudacao()}, {nome} 👋</h2>
        <p style={{ color: 'var(--tx2)', fontSize: 14, margin: '2px 0 0' }}>
          Veja o que está acontecendo hoje na sua {ehArena ? 'Arena' : 'escola'}.
        </p>
      </div>
      <div className="ga-stats" style={{ marginBottom: 20 }}>
        <Stat ico="📅" label="Reservas hoje" value={reservasHoje} />
        <Stat ico="🥅" label={ehArena ? 'Quadras' : 'Quadras parceiras'} value={quadras} />
        <Stat ico="🏟️" label="Espaço" value={org?.tipo === 'arena' ? 'Arena' : 'Escola'} />
        <Stat ico="🔑" label="Seu papel" value={role ?? '—'} />
      </div>
      <div className="ga-card">
        <b>Piloto React + TypeScript</b>
        <p style={{ color: 'var(--tx2)', fontSize: 13, marginTop: 6 }}>
          Esta tela roda em React/TS lendo o mesmo backend Supabase (RLS) dos Lotes 0 e 1.
          As demais telas (agenda em grade, CRUDs, Escola) serão portadas por cima desta base.
        </p>
      </div>
    </div>
  )
}

function Stat({ ico, label, value }: { ico: string; label: string; value: number | string | null }) {
  return (
    <div className="ga-card" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 18, opacity: .8 }}>{ico}</div>
      <div style={{ fontSize: 30, fontWeight: 300, lineHeight: 1.1 }}>{value ?? '…'}</div>
      <div style={{ fontSize: 12, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{label}</div>
    </div>
  )
}
