import { useEffect, useMemo, useRef, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { AgendaQuadra, AgendaReserva, ReservaTipo } from '../lib/database.types'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const H_INI = 6, H_FIM = 22
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const TIPOS: { v: ReservaTipo; label: string; cor: string }[] = [
  { v: 'aula', label: 'Aula/Escolinha', cor: '#3B82F6' }, { v: 'locacao', label: 'Reserva avulsa', cor: '#8B5CF6' },
  { v: 'evento', label: 'Evento', cor: '#EC4899' }, { v: 'manutencao', label: 'Manutenção', cor: '#F59E0B' },
  { v: 'bloqueio', label: 'Bloqueio', cor: '#9AA6A0' }, { v: 'cortesia', label: 'Cortesia', cor: '#14B8A6' },
]
const corTipo = (t: ReservaTipo | null) => TIPOS.find((x) => x.v === t)?.cor ?? '#9AA6A0'
const labelTipo = (t: ReservaTipo | null) => TIPOS.find((x) => x.v === t)?.label ?? 'Reserva'
const hhmm = (t: string) => t.slice(0, 5)
const horaDe = (t: string) => parseInt(t.slice(0, 2), 10)
function addDias(d: Date, n: number) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + n); return x }
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function Agenda() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [dayOff, setDayOff] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [quadras, setQuadras] = useState<AgendaQuadra[]>([])
  const [reservas, setReservas] = useState<AgendaReserva[]>([])
  const [nova, setNova] = useState<{ court?: string; hora?: string } | null>(null)
  const [abrir, setAbrir] = useState<AgendaReserva | null>(null)
  const podeAgenda = ['owner', 'admin', 'gerente', 'operacional', 'recepcao', 'coordenador', 'professor'].includes(role ?? '')

  const dia = useMemo(() => addDias(new Date(), dayOff), [dayOff])
  const chave = iso(dia)

  const cargaRef = useRef(0)
  async function carregar() {
    if (!org) return
    const meu = ++cargaRef.current   // descarta respostas de cargas anteriores (troca rápida de dia/org)
    setLoading(true); setErro(false)
    const { data: qs, error } = await sb.rpc('agenda_quadras', { p_org: org.id })
    if (meu !== cargaRef.current) return
    if (error) { toast(errMsg(error), true); setErro(true); setLoading(false); return }
    const qd = (qs as AgendaQuadra[]) ?? []
    setQuadras(qd)
    if (qd.length) {
      const { data: rs } = await sb.rpc('agenda_reservas', { p_org: org.id, p_court_ids: qd.map((q) => q.court_id), p_de: chave, p_ate: chave })
      if (meu !== cargaRef.current) return
      setReservas((rs as AgendaReserva[]) ?? [])
    } else setReservas([])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [org, chave])

  // índice por quadra→hora
  const cobre = useMemo(() => {
    const m: Record<string, Record<number, { res: AgendaReserva; inicio: boolean }>> = {}
    quadras.forEach((q) => { m[q.court_id] = {} })
    reservas.forEach((x) => {
      const hi = horaDe(x.hora_inicio); let hf = horaDe(x.hora_fim); if (hf <= hi) hf = 24
      for (let h = hi; h < hf; h++) { if (m[x.court_id]) m[x.court_id][h] = { res: x, inicio: h === hi } }
    })
    return m
  }, [quadras, reservas])

  const rotulo = `${DIAS_LONGO[dia.getDay()]}, ${dia.getDate()} de ${MESES[dia.getMonth()]} de ${dia.getFullYear()}`

  if (!loading && erro) return <div className="ga-card"><ErroCarregar onRetry={() => void carregar()} texto="Não foi possível carregar a agenda." /></div>
  if (!loading && quadras.length === 0) {
    const ehArena = org?.tipo === 'arena'
    return <div className="ga-card"><Empty ico="📅" titulo="Sua agenda ainda não tem quadras"
      texto={ehArena ? 'Cadastre unidades e quadras para começar a agendar.' : 'Você agenda nas quadras de arenas parceiras com agenda compartilhada.'} /></div>
  }

  return (
    <div>
      <div className="ga-ag-top">
        <div style={{ display: 'flex', gap: 6 }}>
          <BtnSm onClick={() => setDayOff((d) => d - 1)}>‹</BtnSm>
          <BtnSm onClick={() => setDayOff(0)} style={dayOff === 0 ? { borderColor: 'var(--brand)', color: 'var(--brand)' } : undefined}>Hoje</BtnSm>
          <BtnSm onClick={() => setDayOff((d) => d + 1)}>›</BtnSm>
        </div>
        <div className="ga-ag-data">{rotulo}</div>
        {podeAgenda && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setNova({})}>+ Nova reserva</button>}
      </div>
      <div className="ga-ag-leg">
        <span className="ga-ag-lg" style={{ ['--c' as string]: '#16A34A' }}>Livre</span>
        {TIPOS.map((t) => <span key={t.v} className="ga-ag-lg" style={{ ['--c' as string]: t.cor }}>{t.label.split('/')[0]}</span>)}
      </div>

      {loading ? <div className="ga-card"><Loading /></div> : (
        <div className="ga-ag-scroll"><div className="ga-ag-grid" style={{ gridTemplateColumns: `64px repeat(${quadras.length}, minmax(150px,1fr))` }}>
          <div className="ga-ag-cell ga-ag-corner" />
          {quadras.map((q) => (
            <div key={q.court_id} className="ga-ag-cell ga-ag-colh">
              <b>{q.court_nome}</b><span>{[q.sport_nome, q.sou_dono ? q.unit_nome : q.arena_nome].filter(Boolean).join(' · ')}</span>
            </div>
          ))}
          {Array.from({ length: H_FIM - H_INI + 1 }, (_, i) => H_INI + i).map((h) => (
            <Row key={h} h={h} quadras={quadras} cobre={cobre} podeAgenda={podeAgenda}
              onSlot={(r) => setAbrir(r)} onLivre={(court) => setNova({ court, hora: `${String(h).padStart(2, '0')}:00` })} />
          ))}
        </div></div>
      )}
      {(nova || abrir) && <ReservaModal quadras={quadras} data={chave} nova={nova} abrir={abrir} podeAgenda={podeAgenda}
        onClose={() => { setNova(null); setAbrir(null) }} onSaved={() => { setNova(null); setAbrir(null); void carregar() }} />}
    </div>
  )
}

function Row({ h, quadras, cobre, podeAgenda, onSlot, onLivre }: {
  h: number; quadras: AgendaQuadra[]; cobre: Record<string, Record<number, { res: AgendaReserva; inicio: boolean }>>
  podeAgenda: boolean; onSlot: (r: AgendaReserva) => void; onLivre: (court: string) => void
}) {
  return (
    <>
      <div className="ga-ag-cell ga-ag-hora">{String(h).padStart(2, '0')}:00</div>
      {quadras.map((q) => {
        const c = cobre[q.court_id]?.[h]
        if (c?.res) {
          if (!c.inicio) return null
          const x = c.res; const cor = corTipo(x.tipo)
          let hf = horaDe(x.hora_fim); if (hf <= horaDe(x.hora_inicio)) hf = 24
          const span = Math.max(1, Math.min(hf, H_FIM + 1) - h)
          const sub = x.sou_dono ? '' : (x.dono_nome || (x.titulo === 'Ocupado' ? '' : labelTipo(x.tipo)))
          return (
            <button key={q.court_id} className={'ga-ag-cell ga-ag-slot' + (x.sou_dono ? '' : ' alheia')}
              style={{ gridRow: `span ${span}`, ['--c' as string]: cor }} onClick={() => onSlot(x)}>
              <span className="t">{x.titulo || labelTipo(x.tipo)}</span>
              {sub && <span className="s">{sub}</span>}
              <span className="h">{hhmm(x.hora_inicio)}–{hhmm(x.hora_fim)}</span>
            </button>
          )
        }
        return <button key={q.court_id} className="ga-ag-cell ga-ag-livre" disabled={!podeAgenda} onClick={() => onLivre(q.court_id)}>{podeAgenda ? <span>+</span> : null}</button>
      })}
    </>
  )
}

function ReservaModal({ quadras, data, nova, abrir, podeAgenda, onClose, onSaved }: {
  quadras: AgendaQuadra[]; data: string; nova: { court?: string; hora?: string } | null; abrir: AgendaReserva | null
  podeAgenda: boolean; onClose: () => void; onSaved: () => void
}) {
  const { org } = useAuth()
  const toast = useToast()
  const editando = !!abrir
  const meu = abrir ? abrir.sou_dono : true
  const soLeitura = !!abrir && !meu && !(org?.tipo === 'arena' && podeAgenda)

  const [court, setCourt] = useState(abrir?.court_id ?? nova?.court ?? quadras[0]?.court_id ?? '')
  const [d, setD] = useState(abrir?.data ?? data)
  const [ini, setIni] = useState(abrir ? abrir.hora_inicio.slice(0, 5) : (nova?.hora ?? '19:00'))
  const [fim, setFim] = useState(abrir ? abrir.hora_fim.slice(0, 5) : '20:00')
  const [tipo, setTipo] = useState<ReservaTipo>(abrir?.tipo ?? 'aula')
  const [tit, setTit] = useState(abrir && abrir.titulo !== 'Ocupado' ? abrir.titulo : '')
  const [rep, setRep] = useState(false)
  const [dias, setDias] = useState<number[]>([])
  const [ate, setAte] = useState('')
  const [busy, setBusy] = useState(false)

  if (soLeitura) {
    return <Modal title="Horário ocupado" onClose={onClose}>
      <p style={{ fontSize: 14 }}>{ini}–{fim}</p>
      <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 6 }}>Este horário já está reservado nesta quadra.</p>
      <Foot><BtnGhost onClick={onClose}>Fechar</BtnGhost></Foot>
    </Modal>
  }

  async function salvar() {
    if (!org) return
    // fim<ini é permitido (vira o dia — o backend materializa +1 dia e limita a 18h); só bloqueia duração zero
    if (fim === ini) { toast('O início e o fim não podem ser iguais.', true); return }
    setBusy(true)
    let error
    if (editando && abrir) {
      ({ error } = await sb.rpc('editar_reserva', { p_id: abrir.id, p_data: d, p_inicio: ini, p_fim: fim, p_tipo: tipo, p_titulo: tit, p_obs: null }))
    } else if (rep) {
      if (!dias.length) { toast('Escolha ao menos um dia.', true); setBusy(false); return }
      const { data: r, error: e } = await sb.rpc('criar_reserva_recorrente', { p_org: org.id, p_court: court, p_dias: dias, p_inicio: ini, p_fim: fim, p_tipo: tipo, p_titulo: tit, p_vig_inicio: d, p_vig_fim: ate || null, p_horizonte_dias: 120 })
      error = e
      if (!e && r) {
        const rr = r as { criadas: number; puladas: number }
        toast(`Recorrência: ${rr.criadas} reserva(s) criada(s)${rr.puladas ? `, ${rr.puladas} pulada(s) por conflito` : ''}.`)
      }
    } else {
      ({ error } = await sb.rpc('criar_reserva', { p_org: org.id, p_court: court, p_data: d, p_inicio: ini, p_fim: fim, p_tipo: tipo, p_titulo: tit, p_obs: null }))
    }
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    if (!rep) toast(editando ? 'Reserva atualizada.' : 'Reserva confirmada.')
    onSaved()
  }
  async function cancelar() {
    if (!abrir) return
    const serie = abrir.recurring_id && confirm('Cancelar também as próximas repetições da série?')
    const { error } = serie
      ? await sb.rpc('cancelar_recorrencia', { p_id: abrir.recurring_id!, p_a_partir: abrir.data })
      : await sb.rpc('cancelar_reserva', { p_id: abrir.id })
    if (error) { toast(errMsg(error), true); return }
    toast('Reserva cancelada.'); onSaved()
  }

  const q = quadras.find((k) => k.court_id === court)
  return (
    <Modal title={editando ? 'Editar reserva' : 'Nova reserva'} onClose={onClose}>
      {editando ? <p style={{ fontSize: 12, color: 'var(--tx2)', margin: '-8px 0 14px' }}>Quadra: <b>{q?.court_nome}</b></p>
        : <Field label="Quadra"><select style={inp} value={court} onChange={(e) => setCourt(e.target.value)}>
          {quadras.map((k) => <option key={k.court_id} value={k.court_id}>{k.court_nome}{k.sou_dono ? '' : ' · ' + k.arena_nome}</option>)}
        </select></Field>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Data"><input style={inp} type="date" value={d} onChange={(e) => setD(e.target.value)} /></Field>
        <Field label="Tipo"><select style={inp} value={tipo} onChange={(e) => setTipo(e.target.value as ReservaTipo)}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Início"><input style={inp} type="time" value={ini} onChange={(e) => setIni(e.target.value)} /></Field>
        <Field label="Fim"><input style={inp} type="time" value={fim} onChange={(e) => setFim(e.target.value)} /></Field>
      </div>
      <Field label="Título / Cliente"><input style={inp} value={tit} onChange={(e) => setTit(e.target.value)} placeholder="Ex.: Turma Futvôlei" /></Field>
      {!editando && (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tx2)', marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={rep} onChange={(e) => setRep(e.target.checked)} style={{ width: 'auto' }} />Repetir toda semana
          </label>
          {rep && <>
            <Field label="Dias da semana"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DIAS.map((dd, i) => <button key={i} type="button" onClick={() => setDias((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i])}
                style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (dias.includes(i) ? 'var(--brand)' : 'var(--line2)'), background: dias.includes(i) ? 'var(--brand)' : 'var(--bg2)', color: dias.includes(i) ? '#fff' : 'var(--tx2)' }}>{dd}</button>)}
            </div></Field>
            <Field label="Repetir até (opcional)"><input style={inp} type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></Field>
          </>}
        </>
      )}
      <Foot>
        {editando && <BtnSm danger style={{ marginRight: 'auto' }} onClick={() => void cancelar()}>Cancelar reserva</BtnSm>}
        <BtnGhost onClick={onClose}>Voltar</BtnGhost>
        <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : editando ? 'Salvar' : 'Confirmar'}</button>
      </Foot>
    </Modal>
  )
}
