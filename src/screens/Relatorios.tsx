import { useEffect, useMemo, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { AgendaQuadra, AgendaReserva } from '../lib/database.types'
import { Empty, Loading } from '../ui/kit'

const H_INI = 6, H_FIM = 22
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const horaDe = (t: string) => parseInt(t.slice(0, 2), 10)
const TIPOS: Record<string, { label: string; cor: string }> = {
  aula: { label: 'Aula', cor: '#3B82F6' }, locacao: { label: 'Locação', cor: '#8B5CF6' }, evento: { label: 'Evento', cor: '#EC4899' },
  manutencao: { label: 'Manutenção', cor: '#F59E0B' }, bloqueio: { label: 'Bloqueio', cor: '#9AA6A0' }, cortesia: { label: 'Cortesia', cor: '#14B8A6' },
}
const SITU: Record<string, { label: string; cor: string }> = {
  lead: { label: 'Leads', cor: '#0284C7' }, experimental: { label: 'Experimentais', cor: '#38BDF8' }, ativo: { label: 'Ativos', cor: '#16A34A' },
  pausado: { label: 'Pausados', cor: '#F59E0B' }, cancelado: { label: 'Cancelados', cor: '#94A3B8' }, arquivado: { label: 'Ex-alunos', cor: '#64748B' },
}

function mesesAtras(n: number) {
  const arr: { key: string; label: string }[] = []
  const d = new Date(); d.setDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    arr.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, label: m.toLocaleDateString('pt-BR', { month: 'short' }) })
  }
  return arr
}
function rangeMes(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const ini = `${mes}-01`
  const fimD = new Date(y, m, 0)
  return { ini, fim: `${mes}-${String(fimD.getDate()).padStart(2, '0')}`, dias: fimD.getDate() }
}

export default function Relatorios() {
  const { org, role } = useAuth()
  const ehArena = org?.tipo === 'arena'
  const pode = ['owner', 'admin', 'gerente', 'coordenador', 'financeiro'].includes(role ?? '')
  const podeFin = ['owner', 'admin', 'gerente', 'financeiro'].includes(role ?? '')
  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const [mes, setMes] = useState(mesAtual)
  const [loading, setLoading] = useState(true)
  const [quadras, setQuadras] = useState<AgendaQuadra[]>([])
  const [reservas, setReservas] = useState<AgendaReserva[]>([])
  const [cobrancas, setCobrancas] = useState<{ valor: number; valor_pago: number; status: string; pago_em: string | null; vencimento: string }[]>([])
  const [situacoes, setSituacoes] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!org || !pode) return
    let vivo = true
    setLoading(true)
    const { ini, fim } = rangeMes(mes)
    ;(async () => {
      const { data: qs } = await sb.rpc('agenda_quadras', { p_org: org.id })
      if (!vivo) return
      const qd = (qs as AgendaQuadra[]) ?? []; setQuadras(qd)
      const rs = qd.length ? await sb.rpc('agenda_reservas', { p_org: org.id, p_court_ids: qd.map((q) => q.court_id), p_de: ini, p_ate: fim }) : { data: [] }
      if (!vivo) return
      setReservas((rs.data as AgendaReserva[]) ?? [])
      if (podeFin) {
        const { data: cs } = await sb.from('cobrancas').select('valor,valor_pago,status,pago_em,vencimento').eq('org_id', org.id)
        if (!vivo) return
        setCobrancas((cs as typeof cobrancas) ?? [])
      }
      if (!ehArena) {
        const { data: st } = await sb.from('students').select('situacao').eq('org_id', org.id)
        if (!vivo) return
        const acc: Record<string, number> = {}
        ;(st as { situacao: string }[] ?? []).forEach((s) => { acc[s.situacao] = (acc[s.situacao] ?? 0) + 1 })
        setSituacoes(acc)
      }
      setLoading(false)
    })()
    return () => { vivo = false }
  }, [org, mes, pode, podeFin, ehArena])

  const seisMeses = useMemo(() => mesesAtras(6), [])
  const receitaMes = useMemo(() => {
    const map: Record<string, number> = {}
    cobrancas.filter((c) => c.status === 'pago' && c.pago_em).forEach((c) => { const k = c.pago_em!.slice(0, 7); map[k] = (map[k] ?? 0) + Number(c.valor_pago) })
    return seisMeses.map((m) => ({ ...m, v: map[m.key] ?? 0 }))
  }, [cobrancas, seisMeses])
  const maxRec = Math.max(1, ...receitaMes.map((r) => r.v))

  const kpiFin = useMemo(() => {
    const hj = new Date().toISOString().slice(0, 10)
    const recebido = cobrancas.filter((c) => c.status === 'pago' && (c.pago_em ?? '').slice(0, 7) === mes).reduce((s, c) => s + Number(c.valor_pago), 0)
    const aReceber = cobrancas.filter((c) => c.status === 'pendente' && c.vencimento >= hj).reduce((s, c) => s + (Number(c.valor) - Number(c.valor_pago)), 0)
    const vencido = cobrancas.filter((c) => c.status === 'pendente' && c.vencimento < hj).reduce((s, c) => s + (Number(c.valor) - Number(c.valor_pago)), 0)
    return { recebido, aReceber, vencido }
  }, [cobrancas, mes])

  const ocup = useMemo(() => {
    const { dias } = rangeMes(mes)
    const totalPorQuadra = (H_FIM - H_INI) * dias
    return quadras.map((q) => {
      let horas = 0
      reservas.filter((r) => r.court_id === q.court_id).forEach((r) => { const hi = horaDe(r.hora_inicio); let hf = horaDe(r.hora_fim); if (hf <= hi) hf = H_FIM; horas += Math.max(0, Math.min(hf, H_FIM) - Math.max(hi, H_INI)) })
      return { nome: q.court_nome, pct: totalPorQuadra ? Math.min(100, Math.round((horas / totalPorQuadra) * 100)) : 0 }
    })
  }, [quadras, reservas, mes])

  const porTipo = useMemo(() => {
    const acc: Record<string, number> = {}
    reservas.forEach((r) => { const t = r.tipo ?? 'locacao'; acc[t] = (acc[t] ?? 0) + 1 })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [reservas])

  if (!pode) return <div className="ga-card"><Empty ico="📊" titulo="Sem acesso aos relatórios" texto="Relatórios são para proprietário, administrador, gerente, coordenador e financeiro." /></div>

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="month" style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', color: 'var(--tx)', borderRadius: 10, padding: '8px 12px', fontSize: 14 }} value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" />
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>Relatórios do mês selecionado</span>
      </div>

      {loading ? <div className="ga-card"><Loading /></div> : (
        <>
          {podeFin && (
            <div className="ga-kpis">
              <Card label="Recebido no mês" value={brl(kpiFin.recebido)} cor="var(--ok)" />
              <Card label="A receber" value={brl(kpiFin.aReceber)} cor="var(--brand)" />
              <Card label="Inadimplência" value={brl(kpiFin.vencido)} cor={kpiFin.vencido > 0 ? 'var(--danger)' : 'var(--tx)'} />
              <Card label="Reservas no mês" value={reservas.length} cor="var(--tx)" />
            </div>
          )}

          {podeFin && (
            <div className="ga-card">
              <div className="ga-card-h"><b>Receita recebida — últimos 6 meses</b></div>
              <div className="ga-bars">
                {receitaMes.map((r) => (
                  <div key={r.key} className="ga-bar" title={`${r.label}: ${brl(r.v)}`}>
                    <div className="ga-bar-track"><div className="ga-bar-fill" style={{ transform: `scaleY(${Math.max(0.02, r.v / maxRec)})`, background: 'var(--brand)' }} /></div>
                    <span className="ga-bar-x">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ehArena ? (
            <div className="ga-dash-2col">
              <div className="ga-card">
                <div className="ga-card-h"><b>Ocupação por quadra — {mes.split('-').reverse().join('/')}</b></div>
                {ocup.length === 0 ? <p style={{ fontSize: 13, color: 'var(--tx2)' }}>Sem quadras.</p> : ocup.map((q) => (
                  <div key={q.nome} style={{ margin: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>{q.nome}</span><b>{q.pct}%</b></div>
                    <div style={{ height: 8, borderRadius: 5, background: 'var(--bg2)', overflow: 'hidden' }}><div style={{ width: `${q.pct}%`, height: '100%', background: q.pct > 66 ? 'var(--ok)' : q.pct > 33 ? 'var(--brand)' : 'var(--cyan)' }} /></div>
                  </div>
                ))}
              </div>
              <Distrib titulo="Reservas por tipo" itens={porTipo.map(([t, n]) => ({ label: TIPOS[t]?.label ?? t, cor: TIPOS[t]?.cor ?? '#9AA6A0', n }))} />
            </div>
          ) : (
            <Distrib titulo="Alunos por situação (funil)" itens={Object.keys(SITU).map((k) => ({ label: SITU[k].label, cor: SITU[k].cor, n: situacoes[k] ?? 0 })).filter((x) => x.n > 0)} />
          )}
        </>
      )}
    </div>
  )
}

function Card({ label, value, cor }: { label: string; value: number | string; cor: string }) {
  return <div className="ga-card ga-kpi"><div style={{ fontSize: 12, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 700, color: cor }}>{value}</div></div>
}

function Distrib({ titulo, itens }: { titulo: string; itens: { label: string; cor: string; n: number }[] }) {
  const total = Math.max(1, itens.reduce((s, i) => s + i.n, 0))
  return (
    <div className="ga-card">
      <div className="ga-card-h"><b>{titulo}</b></div>
      {itens.length === 0 ? <p style={{ fontSize: 13, color: 'var(--tx2)' }}>Sem dados no período.</p> : itens.map((i) => (
        <div key={i.label} style={{ margin: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>{i.label}</span><b>{i.n}</b></div>
          <div style={{ height: 8, borderRadius: 5, background: 'var(--bg2)', overflow: 'hidden' }}><div style={{ width: `${(i.n / total) * 100}%`, height: '100%', background: i.cor }} /></div>
        </div>
      ))}
    </div>
  )
}
