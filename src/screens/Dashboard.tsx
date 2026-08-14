import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { sb } from '../lib/supabase'
import type { AgendaQuadra, AgendaReserva, Vinculo } from '../lib/database.types'

const H_INI = 6, H_FIM = 22
function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }
function isoLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const hhmm = (t?: string | null) => (t ?? '').slice(0, 5)
const horaDe = (t: string) => parseInt(t.slice(0, 2), 10)
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Dashboard() {
  const { org, user, role } = useAuth()
  const ehArena = org?.tipo === 'arena'
  const podeFin = ['owner', 'admin', 'gerente', 'financeiro'].includes(role ?? '')
  const [quadras, setQuadras] = useState<AgendaQuadra[]>([])
  const [reservas, setReservas] = useState<AgendaReserva[]>([])
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [alunos, setAlunos] = useState<number | null>(null)
  const [turmas, setTurmas] = useState<number | null>(null)
  const [receita, setReceita] = useState<number | null>(null)
  const [atraso, setAtraso] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!org) return
    let vivo = true
    setCarregando(true)
    const hoje = isoLocal(new Date())
    ;(async () => {
      const { data: qs } = await sb.rpc('agenda_quadras', { p_org: org.id })
      if (!vivo) return
      const qd = (qs as AgendaQuadra[]) ?? []
      setQuadras(qd)
      const [rs, vc] = await Promise.all([
        qd.length ? sb.rpc('agenda_reservas', { p_org: org.id, p_court_ids: qd.map((q) => q.court_id), p_de: hoje, p_ate: hoje }) : Promise.resolve({ data: [] }),
        sb.rpc('meus_vinculos', { p_org: org.id }),
      ])
      if (!vivo) return
      setReservas((rs.data as AgendaReserva[]) ?? [])
      setVinculos((vc.data as Vinculo[]) ?? [])
      if (org.tipo === 'escola') {
        const [a, t] = await Promise.all([
          sb.from('students').select('id', { count: 'exact', head: true }).eq('org_id', org.id).not('situacao', 'in', '("cancelado","arquivado")'),
          sb.from('classes').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('ativo', true),
        ])
        if (!vivo) return
        setAlunos(a.count ?? 0); setTurmas(t.count ?? 0)
      }
      if (podeFin) {
        const { data: cobs } = await sb.from('cobrancas').select('valor_pago,status,pago_em,vencimento').eq('org_id', org.id)
        if (!vivo) return
        const rows = (cobs ?? []) as { valor_pago: number; status: string; pago_em: string | null; vencimento: string }[]
        const mes = hoje.slice(0, 7)
        setReceita(rows.filter((c) => c.status === 'pago' && (c.pago_em ?? '').slice(0, 7) === mes).reduce((s, c) => s + Number(c.valor_pago), 0))
        setAtraso(rows.filter((c) => c.status === 'pendente' && c.vencimento < hoje).length)
      }
      setCarregando(false)
    })()
    return () => { vivo = false }
  }, [org])

  const nomeQuadra = useMemo(() => Object.fromEntries(quadras.map((q) => [q.court_id, q.court_nome])), [quadras])

  // ocupação de hoje
  const { ocupPct, porHora, vagas } = useMemo(() => {
    const n = quadras.length
    const totalCel = n * (H_FIM - H_INI)
    const cells = new Set<string>()
    const hora: Record<number, Set<string>> = {}
    for (let h = H_INI; h < H_FIM; h++) hora[h] = new Set()
    reservas.forEach((r) => {
      const hi = horaDe(r.hora_inicio); let hf = horaDe(r.hora_fim); if (hf <= hi) hf = H_FIM
      for (let h = Math.max(hi, H_INI); h < Math.min(hf, H_FIM); h++) { cells.add(r.court_id + ':' + h); hora[h]?.add(r.court_id) }
    })
    const porHora = Array.from({ length: H_FIM - H_INI }, (_, i) => ({ h: H_INI + i, pct: n ? (hora[H_INI + i].size / n) : 0 }))
    return { ocupPct: totalCel ? Math.round((cells.size / totalCel) * 100) : 0, porHora, vagas: Math.max(0, totalCel - cells.size) }
  }, [quadras, reservas])

  const pendentes = vinculos.filter((v) => v.status === 'pendente' && !v.eu_criei)
  const agendaHoje = [...reservas].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  const nome = (user?.user_metadata?.nome as string | undefined)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? ''

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{saudacao()}, {nome} 👋</h2>
        <p style={{ color: 'var(--tx2)', fontSize: 14, margin: '2px 0 0' }}>Veja o que está acontecendo hoje na sua {ehArena ? 'Arena' : 'escola'}.</p>
      </div>

      {/* KPIs */}
      <div className="ga-kpis">
        {ehArena ? (
          <>
            <Kpi ico="💰" label="Receita do mês" value={podeFin ? (receita != null ? brl(receita) : '…') : '—'} hint={podeFin ? 'recebido no mês' : 'sem acesso'} tone="ok" />
            <Kpi ico="🎯" label="Ocupação média" value={`${ocupPct}%`} hint="hoje" tone="ok" />
            <Kpi ico="📅" label="Reservas hoje" value={carregando ? '…' : reservas.length} hint={`${quadras.length} quadra(s)`} />
            <Kpi ico="⚠️" label="Pendências" value={pendentes.length} hint={pendentes.length ? 'Ver abaixo' : 'tudo em dia'} tone={pendentes.length ? 'warn' : undefined} />
          </>
        ) : (
          <>
            <Kpi ico="🎓" label="Alunos ativos" value={alunos ?? '…'} />
            <Kpi ico="💰" label="Receita do mês" value={podeFin ? (receita != null ? brl(receita) : '…') : '—'} hint={podeFin ? 'recebido no mês' : 'sem acesso'} tone="ok" />
            <Kpi ico="⏰" label="Em atraso" value={podeFin ? (atraso ?? '…') : '—'} hint={podeFin ? (atraso ? 'mensalidade(s) vencida(s)' : 'em dia') : 'sem acesso'} tone={atraso ? 'warn' : undefined} />
            <Kpi ico="🏐" label="Turmas" value={turmas ?? '…'} />
          </>
        )}
      </div>

      {/* Agenda de hoje + Precisa da sua atenção */}
      <div className="ga-dash-2col">
        <div className="ga-card">
          <div className="ga-card-h"><b>{ehArena ? 'Agenda de hoje' : 'Próximas aulas de hoje'}</b></div>
          {carregando ? <p style={muted}>Carregando…</p> : agendaHoje.length === 0 ? (
            <p style={muted}>Nada agendado para hoje.</p>
          ) : (
            <div style={{ display: 'grid' }}>
              {agendaHoje.slice(0, 6).map((r) => (
                <div key={r.id} className="ga-agrow">
                  <span className="ga-agrow-h">{hhmm(r.hora_inicio)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.titulo || 'Reserva'}</b>
                    <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{nomeQuadra[r.court_id] ?? '—'}{r.dono_nome ? ' · ' + r.dono_nome : ''}</span>
                  </span>
                  <span className={'ga-chip ' + (r.recurring_id ? 'ga-chip-info' : 'ga-chip-ok')}>{r.recurring_id ? 'Recorrente' : 'Confirmado'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ga-card">
          <div className="ga-card-h"><b>Precisa da sua atenção</b></div>
          <div style={{ display: 'grid', gap: 10 }}>
            {podeFin && (atraso ?? 0) > 0 && <Alerta cor="var(--danger)" ico="💰" titulo={`${atraso} cobrança(s) vencida(s)`} texto="Inadimplência para cobrar — veja em Financeiro." />}
            {pendentes.map((v) => (
              <Alerta key={v.id} cor="var(--brand)" ico="🤝" titulo={`Convite de ${v.parceiro_nome}`} texto="Parceria aguardando sua resposta em Parceiros." />
            ))}
            {ehArena && vagas > 0 && <Alerta cor="var(--warn)" ico="🕓" titulo={`${vagas} horário(s) vago(s) hoje`} texto="Oportunidade de preencher a agenda." />}
            {pendentes.length === 0 && !(ehArena && vagas > 0) && !(podeFin && (atraso ?? 0) > 0) && <p style={muted}>Sem alertas críticos. 🎉</p>}
          </div>
        </div>
      </div>

      {/* Analytics */}
      {ehArena && (
        <div className="ga-card">
          <div className="ga-card-h"><b>Ocupação por horário — hoje</b><span style={{ fontSize: 12, color: 'var(--tx2)' }}>{ocupPct}% média</span></div>
          <div className="ga-bars">
            {porHora.map((b) => (
              <div key={b.h} className="ga-bar" title={`${String(b.h).padStart(2, '0')}h · ${Math.round(b.pct * 100)}%`}>
                <div className="ga-bar-track"><div className="ga-bar-fill" style={{ transform: `scaleY(${Math.max(0.04, b.pct)})`, background: b.pct > 0.66 ? 'var(--ok)' : b.pct > 0.33 ? 'var(--brand)' : 'var(--cyan)' }} /></div>
                <span className="ga-bar-x">{String(b.h).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--tx3)', margin: 0 }}>Papel: {role ?? '—'}</p>
    </div>
  )
}

const muted: React.CSSProperties = { fontSize: 13, color: 'var(--tx2)', padding: '10px 2px' }

function Kpi({ ico, label, value, hint, tone }: { ico: string; label: string; value: number | string; hint?: string; tone?: 'brand' | 'ok' | 'warn' }) {
  const cor = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'brand' ? 'var(--brand)' : 'var(--tx3)'
  return (
    <div className="ga-card ga-kpi">
      <div className="ga-kpi-top"><span style={{ fontSize: 12, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span><span aria-hidden style={{ fontSize: 16 }}>{ico}</span></div>
      <div style={{ fontSize: 30, fontWeight: 300, lineHeight: 1.1 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: cor, marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

function Alerta({ cor, ico, titulo, texto }: { cor: string; ico: string; titulo: string; texto: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ color: cor, fontSize: 15, lineHeight: 1.3 }} aria-hidden>{ico}</span>
      <span><b style={{ fontSize: 13, display: 'block' }}>{titulo}</b><span style={{ fontSize: 12, color: 'var(--tx2)' }}>{texto}</span></span>
    </div>
  )
}
