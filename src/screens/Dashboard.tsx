import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { sb } from '../lib/supabase'

function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }
// data local (não UTC): toISOString viraria o dia após 21h no Brasil (UTC-3)
function isoLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function Dashboard() {
  const { org, user, role } = useAuth()
  const ehArena = org?.tipo === 'arena'
  const [reservasHoje, setReservasHoje] = useState<number | null>(null)
  const [quadras, setQuadras] = useState<number | null>(null)
  const [alunos, setAlunos] = useState<number | null>(null)
  const [turmas, setTurmas] = useState<number | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!org) return
    let vivo = true
    setErro(false)
    ;(async () => {
      const hoje = isoLocal(new Date())
      const { data: qs, error: eq } = await sb.rpc('agenda_quadras', { p_org: org.id })
      if (!vivo) return
      if (eq) { setErro(true); return }
      const ids = (qs ?? []).map((q: { court_id: string }) => q.court_id)
      setQuadras(ids.length)
      if (ids.length) {
        const { data: rs, error: er } = await sb.rpc('agenda_reservas', { p_org: org.id, p_court_ids: ids, p_de: hoje, p_ate: hoje })
        if (!vivo) return
        if (er) { setErro(true); return }
        setReservasHoje((rs ?? []).length)
      } else setReservasHoje(0)
      if (org.tipo === 'escola') {
        const [a, t] = await Promise.all([
          sb.from('students').select('id', { count: 'exact', head: true }).eq('org_id', org.id).not('situacao', 'in', '("cancelado","arquivado")'),
          sb.from('classes').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('ativo', true),
        ])
        if (!vivo) return
        if (a.error || t.error) { setErro(true); return }
        setAlunos(a.count ?? 0); setTurmas(t.count ?? 0)
      }
    })()
    return () => { vivo = false }
  }, [org])

  const nome = (user?.user_metadata?.nome as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0] ?? 'bem-vindo'

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{saudacao()}, {nome} 👋</h2>
        <p style={{ color: 'var(--tx2)', fontSize: 14, margin: '2px 0 0' }}>
          Veja o que está acontecendo hoje na sua {ehArena ? 'Arena' : 'escola'}.
        </p>
      </div>
      {erro && <div role="alert" className="ga-card" style={{ marginBottom: 16, borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 13 }}>
        Não foi possível carregar alguns indicadores. Atualize a página para tentar de novo.
      </div>}
      <div className="ga-stats">
        <Stat ico="📅" label="Reservas hoje" value={reservasHoje} />
        {ehArena ? (
          <Stat ico="🥅" label="Quadras" value={quadras} />
        ) : (
          <>
            <Stat ico="🎓" label="Alunos ativos" value={alunos} />
            <Stat ico="🏐" label="Turmas" value={turmas} />
          </>
        )}
        <Stat ico="🔑" label="Seu papel" value={role ?? '—'} />
      </div>
    </div>
  )
}

function Stat({ ico, label, value }: { ico: string; label: string; value: number | string | null }) {
  return (
    <div className="ga-card" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 18, opacity: .8 }} aria-hidden>{ico}</div>
      <div style={{ fontSize: 30, fontWeight: 300, lineHeight: 1.1 }}>{value ?? '…'}</div>
      <div style={{ fontSize: 12, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{label}</div>
    </div>
  )
}
