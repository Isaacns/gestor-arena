import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { AgendaQuadra, ClassRow, Enrollment, ExternalVenue, PresencaStatus, Professional, Student } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const PRESENCA: { v: PresencaStatus; label: string; cor: string }[] = [
  { v: 'presente', label: 'Presente', cor: '#16A34A' },
  { v: 'ausente', label: 'Falta', cor: '#DC2626' },
  { v: 'justificada', label: 'Justificada', cor: '#F59E0B' },
  { v: 'reposicao', label: 'Reposição', cor: '#0284C7' },
]
function hhmm(t?: string | null) { return (t ?? '').slice(0, 5) }
// data local (não UTC): toISOString viraria o dia após 21h no Brasil (UTC-3)
function isoLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function Turmas() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState<ClassRow[]>([])
  const [profs, setProfs] = useState<Professional[]>([])
  const [ocup, setOcup] = useState<Record<string, number>>({})
  const [criar, setCriar] = useState(false)
  const [gerir, setGerir] = useState<ClassRow | null>(null)
  const podeGerir = ['owner', 'admin', 'gerente', 'coordenador'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true)
    const [c, p, e] = await Promise.all([
      sb.from('classes').select('*').eq('org_id', org.id).eq('ativo', true).order('nome'),
      sb.from('professionals').select('*').eq('org_id', org.id).eq('ativo', true).order('nome'),
      sb.from('enrollments').select('class_id').eq('org_id', org.id).eq('status', 'ativa'),
    ])
    if (c.error || p.error || e.error) toast(errMsg(c.error || p.error || e.error), true)
    setTurmas((c.data as ClassRow[]) ?? [])
    setProfs((p.data as Professional[]) ?? [])
    const o: Record<string, number> = {}
    ;(e.data ?? []).forEach((r: { class_id: string }) => { o[r.class_id] = (o[r.class_id] ?? 0) + 1 })
    setOcup(o)
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])
  const nomeProf = (id: string | null) => profs.find((p) => p.id === id)?.nome ?? '—'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{turmas.length} turma(s)</span>
        {podeGerir && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setCriar(true)}>+ Nova turma</button>}
      </div>

      {loading ? <div className="ga-card"><Loading /></div> : turmas.length === 0 ? (
        <div className="ga-card"><Empty ico="🏐" titulo="Nenhuma turma" texto="Crie turmas com professor, capacidade, dias e horário. Depois matricule alunos e faça a chamada.">
          {podeGerir && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setCriar(true)}>Criar turma</button>}
        </Empty></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {turmas.map((t) => {
            const n = ocup[t.id] ?? 0; const cheia = n >= t.capacidade
            return (
              <div key={t.id} className="ga-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: 15 }}>{t.nome}</b>
                  <Badge color={cheia ? '#DC2626' : '#16A34A'}>{n}/{t.capacidade}</Badge>
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 6, lineHeight: 1.7 }}>
                  <div>👤 {nomeProf(t.professor_id)}</div>
                  <div>📅 {(t.dias_semana ?? []).map((d) => DIAS[d]).join(', ') || '—'} · {hhmm(t.hora_inicio)}{t.hora_fim ? '–' + hhmm(t.hora_fim) : ''}</div>
                  {t.mensalidade != null && <div>💰 R$ {Number(t.mensalidade).toFixed(2)}</div>}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <BtnSm onClick={() => setGerir(t)}>Gerir turma</BtnSm>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {criar && <CriarTurma profs={profs} onClose={() => setCriar(false)} onSaved={() => { setCriar(false); void carregar() }} />}
      {gerir && <GerirTurma turma={gerir} onClose={() => setGerir(null)} onChange={carregar} />}
    </div>
  )
}

function CriarTurma({ profs, onClose, onSaved }: { profs: Professional[]; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth()
  const toast = useToast()
  const [nome, setNome] = useState(''); const [prof, setProf] = useState('')
  const [cap, setCap] = useState('8'); const [dias, setDias] = useState<number[]>([])
  const [ini, setIni] = useState('19:00'); const [fim, setFim] = useState('20:00'); const [mens, setMens] = useState('')
  const [espaco, setEspaco] = useState('')   // '' | 'court:<id>' | 'venue:<id>'
  const [quadras, setQuadras] = useState<AgendaQuadra[]>([])
  const [venues, setVenues] = useState<ExternalVenue[]>([])
  const [busy, setBusy] = useState(false)
  function toggleDia(d: number) { setDias((s) => s.includes(d) ? s.filter((x) => x !== d) : [...s, d]) }

  // quadras de arenas parceiras (com agenda) + locais próprios, para amarrar a turma a um espaço
  useEffect(() => {
    if (!org) return
    let vivo = true
    ;(async () => {
      const [q, v] = await Promise.all([
        sb.rpc('agenda_quadras', { p_org: org.id }),
        sb.from('external_venues').select('*').eq('org_id', org.id).eq('ativo', true).order('nome'),
      ])
      if (!vivo) return
      setQuadras((q.data as AgendaQuadra[]) ?? [])
      setVenues((v.data as ExternalVenue[]) ?? [])
    })()
    return () => { vivo = false }
  }, [org])

  async function salvar() {
    if (!org) return
    if (!nome.trim()) { toast('Informe o nome da turma.', true); return }
    const p_court = espaco.startsWith('court:') ? espaco.slice(6) : null
    const p_external_venue = espaco.startsWith('venue:') ? espaco.slice(6) : null
    if (p_court && dias.length === 0) { toast('Para reservar a quadra da arena, escolha os dias da turma.', true); return }
    setBusy(true)
    const { error } = await sb.rpc('criar_turma', {
      p_org: org.id, p_nome: nome.trim(), p_sport: null, p_nivel: '', p_professor: prof || null,
      p_capacidade: Number(cap) || 8, p_dias: dias, p_inicio: ini, p_fim: fim,
      p_mensalidade: mens ? Number(mens) : null,
      p_court, p_external_venue, p_vig_fim: null,
    })
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast(p_court ? 'Turma criada e reservas geradas na agenda.' : 'Turma criada.'); onSaved()
  }

  return (
    <Modal title="Nova turma" onClose={onClose}>
      <Field label="Nome *"><input style={inp} placeholder="Futvôlei Iniciante" value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Professor"><select style={inp} value={prof} onChange={(e) => setProf(e.target.value)}>
          <option value="">—</option>
          {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select></Field>
        <Field label="Capacidade"><input style={inp} type="number" min={1} value={cap} onChange={(e) => setCap(e.target.value)} /></Field>
      </div>
      <Field label="Dias da semana">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DIAS.map((d, i) => (
            <button key={i} type="button" onClick={() => toggleDia(i)} style={{
              fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + (dias.includes(i) ? 'var(--brand)' : 'var(--line2)'),
              background: dias.includes(i) ? 'var(--brand)' : 'var(--bg2)', color: dias.includes(i) ? '#fff' : 'var(--tx2)',
            }}>{d}</button>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Início"><input style={inp} type="time" value={ini} onChange={(e) => setIni(e.target.value)} /></Field>
        <Field label="Fim"><input style={inp} type="time" value={fim} onChange={(e) => setFim(e.target.value)} /></Field>
        <Field label="Mensalidade"><input style={inp} type="number" placeholder="280" value={mens} onChange={(e) => setMens(e.target.value)} /></Field>
      </div>
      {(quadras.length > 0 || venues.length > 0) && (
        <Field label="Onde acontece? (opcional)">
          <select style={inp} value={espaco} onChange={(e) => setEspaco(e.target.value)}>
            <option value="">Definir depois</option>
            {quadras.length > 0 && <optgroup label="Quadra de arena parceira (gera a reserva na agenda)">
              {quadras.map((q) => <option key={q.court_id} value={`court:${q.court_id}`}>{q.court_nome} · {q.arena_nome}</option>)}
            </optgroup>}
            {venues.length > 0 && <optgroup label="Local próprio">
              {venues.map((v) => <option key={v.id} value={`venue:${v.id}`}>{v.nome}</option>)}
            </optgroup>}
          </select>
        </Field>
      )}
      {espaco.startsWith('court:') && <p style={{ fontSize: 12, color: 'var(--tx2)', margin: '-8px 0 12px' }}>A reserva recorrente da turma entra automaticamente na agenda desta quadra.</p>}
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Criar turma'}</button>
      </Foot>
    </Modal>
  )
}

function GerirTurma({ turma, onClose, onChange }: { turma: ClassRow; onClose: () => void; onChange: () => Promise<void> }) {
  const { org, role } = useAuth()
  const toast = useToast()
  // espelha os gates do backend: matricular/cancelar = pode_cadastrar_aluno; chamada = pode_gerir_escola ∪ recepção ∪ professor
  const podeMatricular = ['owner', 'admin', 'gerente', 'coordenador', 'recepcao'].includes(role ?? '')
  const podeChamada = ['owner', 'admin', 'gerente', 'coordenador', 'recepcao', 'professor'].includes(role ?? '')
  const [enr, setEnr] = useState<(Enrollment & { student: Student })[]>([])
  const [alunos, setAlunos] = useState<Student[]>([])
  const [sel, setSel] = useState('')
  const [chamada, setChamada] = useState(false)

  async function carregar() {
    if (!org) return
    const [e, a] = await Promise.all([
      sb.from('enrollments').select('*, student:students(*)').eq('class_id', turma.id).eq('status', 'ativa'),
      sb.from('students').select('*').eq('org_id', org.id).not('situacao', 'in', '("cancelado","arquivado")').order('nome'),
    ])
    if (e.error || a.error) toast(errMsg(e.error || a.error), true)
    setEnr((e.data as (Enrollment & { student: Student })[]) ?? [])
    setAlunos((a.data as Student[]) ?? [])
  }
  useEffect(() => { void carregar() }, [turma.id])

  async function matricular() {
    if (!sel) return
    const { error } = await sb.rpc('matricular_aluno', { p_class: turma.id, p_student: sel })
    if (error) { toast(errMsg(error), true); return }
    toast('Aluno matriculado.'); setSel(''); await carregar(); await onChange()
  }
  async function desmatricular(id: string, nome?: string) {
    if (!confirm(`Remover ${nome ?? 'este aluno'} da turma? A matrícula será cancelada.`)) return
    const { error } = await sb.rpc('cancelar_matricula', { p_enrollment: id })
    if (error) { toast(errMsg(error), true); return }
    toast('Matrícula cancelada.'); await carregar(); await onChange()
  }

  const jaMatriculados = new Set(enr.map((e) => e.student_id))
  const disponiveis = alunos.filter((a) => !jaMatriculados.has(a.id))

  return (
    <Modal title={turma.nome} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{enr.length}/{turma.capacidade} matriculados</span>
        {podeChamada && <BtnSm onClick={() => setChamada(true)} disabled={enr.length === 0}>Fazer chamada</BtnSm>}
      </div>
      {enr.length === 0 ? <p style={{ fontSize: 13, color: 'var(--tx3)', padding: '8px 0' }}>Nenhum aluno matriculado ainda.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {enr.map((e) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10 }}>
              <span style={{ fontSize: 14 }}>{e.student?.nome}</span>
              {podeMatricular && <BtnSm danger onClick={() => void desmatricular(e.id, e.student?.nome)}>Remover</BtnSm>}
            </div>
          ))}
        </div>
      )}
      {podeMatricular && enr.length < turma.capacidade && (
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={{ ...inp, flex: 1 }} value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Selecionar aluno para matricular">
            <option value="">Matricular aluno…</option>
            {disponiveis.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <button className="ga-btn" style={{ width: 'auto' }} disabled={!sel} onClick={() => void matricular()}>Matricular</button>
        </div>
      )}
      <Foot><BtnGhost onClick={onClose}>Fechar</BtnGhost></Foot>
      {chamada && <Chamada turma={turma} enr={enr} onClose={() => setChamada(false)} />}
    </Modal>
  )
}

function Chamada({ turma, enr, onClose }: { turma: ClassRow; enr: (Enrollment & { student: Student })[]; onClose: () => void }) {
  const toast = useToast()
  const [data, setData] = useState(isoLocal(new Date()))
  const [marc, setMarc] = useState<Record<string, PresencaStatus>>({})
  const [jaReg, setJaReg] = useState(false)
  const [busy, setBusy] = useState(false)

  // ao abrir / trocar a data, carrega a presença já registrada (evita sobrescrever em silêncio)
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data: att } = await sb.from('attendance').select('student_id, status').eq('class_id', turma.id).eq('data', data)
      if (!vivo) return
      const prev: Record<string, PresencaStatus> = {}
      ;(att ?? []).forEach((a: { student_id: string; status: PresencaStatus }) => { prev[a.student_id] = a.status })
      setJaReg((att ?? []).length > 0)
      setMarc(Object.fromEntries(enr.map((e) => [e.student_id, prev[e.student_id] ?? 'presente'] as [string, PresencaStatus])))
    })()
    return () => { vivo = false }
  }, [data, turma.id])

  async function salvar() {
    setBusy(true)
    const itens = enr.map((e) => ({ student_id: e.student_id, status: marc[e.student_id] ?? 'presente' }))
    const { error } = await sb.rpc('registrar_chamada', { p_class: turma.id, p_data: data, p_itens: itens })
    if (error) { setBusy(false); toast(errMsg(error), true); return }
    // oferece reposição para as faltas (só na 1ª chamada da data, para não duplicar)
    const ausentes = enr.filter((e) => (marc[e.student_id] ?? 'presente') === 'ausente')
    if (!jaReg && ausentes.length > 0 && confirm(`${ausentes.length} aluno(s) faltaram. Criar reposição pendente para eles?`)) {
      const { error: em } = await sb.from('makeups').insert(ausentes.map((e) => ({ org_id: turma.org_id, student_id: e.student_id, origem_class_id: turma.id, origem_data: data, status: 'pendente' })))
      setBusy(false)
      toast(em ? 'Chamada registrada. (Você não tem permissão para gerar reposições.)' : `Chamada registrada e ${ausentes.length} reposição(ões) criada(s).`, !!em)
      onClose(); return
    }
    setBusy(false)
    toast(jaReg ? 'Chamada atualizada.' : 'Chamada registrada.'); onClose()
  }

  return (
    <Modal title={'Chamada — ' + turma.nome} onClose={onClose}>
      <Field label="Data da aula"><input style={inp} type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
      {jaReg && <p role="status" style={{ fontSize: 12, color: 'var(--warn)', margin: '-8px 0 12px' }}>Já existe chamada nesta data — salvar vai atualizá-la.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '6px 0 4px' }}>
        {enr.map((e) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.student?.nome}</span>
            <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
              {PRESENCA.map((p) => {
                const on = (marc[e.student_id] ?? 'presente') === p.v
                return <button key={p.v} type="button" title={p.label}
                  onClick={() => setMarc((s) => ({ ...s, [e.student_id]: p.v }))}
                  style={{ fontSize: 11, padding: '5px 8px', borderRadius: 7, cursor: 'pointer', fontWeight: 600,
                    border: '1px solid ' + (on ? p.cor : 'var(--line2)'),
                    background: on ? p.cor : 'transparent', color: on ? '#fff' : 'var(--tx2)' }}>{p.label}</button>
              })}
            </div>
          </div>
        ))}
      </div>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : jaReg ? 'Atualizar chamada' : 'Registrar chamada'}</button>
      </Foot>
    </Modal>
  )
}
