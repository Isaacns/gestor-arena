import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

type RStatus = 'pendente' | 'agendada' | 'realizada' | 'cancelada'
interface Rep { id: string; org_id: string; student_id: string; origem_class_id: string | null; origem_data: string | null; destino_class_id: string | null; destino_data: string | null; status: RStatus; obs: string | null; student?: { nome: string } | null }
const ST: Record<RStatus, { label: string; chip: string }> = {
  pendente: { label: 'Pendente', chip: 'ga-chip-warn' }, agendada: { label: 'Agendada', chip: 'ga-chip-info' },
  realizada: { label: 'Realizada', chip: 'ga-chip-ok' }, cancelada: { label: 'Cancelada', chip: 'ga-chip-muted' },
}
const fmt = (s: string | null) => s ? s.split('-').reverse().join('/') : '—'
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
type Turma = { id: string; nome: string; dias_semana: number[] | null; hora_inicio: string | null }
const rotuloTurma = (t: Turma) => `${t.nome}${t.dias_semana?.length ? ' · ' + t.dias_semana.map((d) => DIAS[d]).join('/') : ''}${t.hora_inicio ? ' ' + t.hora_inicio.slice(0, 5) : ''}`

export default function Reposicoes() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Rep[]>([])
  const [alunos, setAlunos] = useState<{ id: string; nome: string }[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [edit, setEdit] = useState<Partial<Rep> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'coordenador', 'recepcao'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true); setErro(false)
    const [r, a, t] = await Promise.all([
      sb.from('makeups').select('*, student:students(nome)').eq('org_id', org.id).order('criado_em', { ascending: false }),
      sb.from('students').select('id, nome').eq('org_id', org.id).not('situacao', 'in', '("cancelado","arquivado")').order('nome'),
      sb.from('classes').select('id, nome, dias_semana, hora_inicio').eq('org_id', org.id).eq('ativo', true).order('nome'),
    ])
    if (r.error) { setErro(true); setLoading(false); return }
    setLista((r.data as Rep[]) ?? []); setAlunos((a.data as { id: string; nome: string }[]) ?? []); setTurmas((t.data as Turma[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])
  const nomeTurma = (id: string | null) => turmas.find((c) => c.id === id)?.nome ?? '—'

  async function mudar(r: Rep, status: RStatus) {
    const { error } = await sb.from('makeups').update({ status }).eq('id', r.id)
    if (error) return toast(errMsg(error), true)
    toast('Status atualizado.'); void carregar()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{lista.filter((r) => r.status === 'pendente' || r.status === 'agendada').length} em aberto</span>
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Nova reposição</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : lista.length === 0 ? (
          <Empty ico="🔁" titulo="Nenhuma reposição" texto="Registre quando um aluno faltou e tem direito a repor, e agende a reposição em outra turma/data.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Nova reposição</button>}
          </Empty>
        ) : (
          <div className="ga-tablewrap">
            <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Aluno', 'Faltou em', 'Repõe em', 'Status', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{lista.map((r) => (
                <tr key={r.id}>
                  <td style={td}><b>{r.student?.nome ?? '—'}</b></td>
                  <td style={td}>{nomeTurma(r.origem_class_id)} · {fmt(r.origem_data)}</td>
                  <td style={td}>{r.destino_class_id ? `${nomeTurma(r.destino_class_id)} · ${fmt(r.destino_data)}` : '—'}</td>
                  <td style={td}><span className={'ga-chip ' + ST[r.status].chip}>{ST[r.status].label}</span></td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {pode && (r.status === 'pendente' || r.status === 'agendada') && <BtnSm onClick={() => void mudar(r, 'realizada')} style={{ marginRight: 6 }}>Realizada</BtnSm>}
                    {pode && <BtnSm onClick={() => setEdit(r)}>Editar</BtnSm>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarRep rep={edit} alunos={alunos} turmas={turmas} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarRep({ rep, alunos, turmas, onClose, onSaved }: { rep: Partial<Rep>; alunos: { id: string; nome: string }[]; turmas: Turma[]; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<Rep>>({ status: 'pendente', ...rep })
  const [busy, setBusy] = useState(false)
  const editando = !!rep.id
  const set = <K extends keyof Rep>(k: K, v: Rep[K]) => setF((s) => ({ ...s, [k]: v }))
  async function salvar() {
    if (!org) return
    if (!f.student_id) return toast('Escolha o aluno.', true)
    if (f.destino_class_id && f.destino_data) {
      const tt = turmas.find((t) => t.id === f.destino_class_id)
      const dow = new Date(f.destino_data + 'T00:00:00').getDay()
      if (tt?.dias_semana?.length && !tt.dias_semana.includes(dow) && !confirm('A data escolhida não é um dia dessa turma. Agendar mesmo assim?')) return
    }
    setBusy(true)
    const dados = { org_id: org.id, student_id: f.student_id, origem_class_id: f.origem_class_id || null, origem_data: f.origem_data || null, destino_class_id: f.destino_class_id || null, destino_data: f.destino_data || null, status: (f.destino_class_id && f.destino_data && f.status === 'pendente') ? 'agendada' : (f.status || 'pendente'), obs: f.obs || null }
    const { error } = editando ? await sb.from('makeups').update(dados).eq('id', rep.id!) : await sb.from('makeups').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }
  return (
    <Modal title={editando ? 'Editar reposição' : 'Nova reposição'} onClose={onClose}>
      <Field label="Aluno *"><select style={inp} value={f.student_id ?? ''} onChange={(e) => set('student_id', e.target.value)}><option value="">— escolha —</option>{alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Faltou na turma"><select style={inp} value={f.origem_class_id ?? ''} onChange={(e) => set('origem_class_id', e.target.value || null)}><option value="">—</option>{turmas.map((t) => <option key={t.id} value={t.id}>{rotuloTurma(t)}</option>)}</select></Field>
        <Field label="Data da falta"><input type="date" style={inp} value={f.origem_data ?? ''} onChange={(e) => set('origem_data', e.target.value || null)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Repõe na turma"><select style={inp} value={f.destino_class_id ?? ''} onChange={(e) => set('destino_class_id', e.target.value || null)}><option value="">— a definir —</option>{turmas.map((t) => <option key={t.id} value={t.id}>{rotuloTurma(t)}</option>)}</select></Field>
        <Field label="Data da reposição"><input type="date" style={inp} value={f.destino_data ?? ''} onChange={(e) => set('destino_data', e.target.value || null)} /></Field>
      </div>
      {editando && <Field label="Status"><select style={inp} value={f.status ?? 'pendente'} onChange={(e) => set('status', e.target.value as RStatus)}>{(Object.keys(ST) as RStatus[]).map((s) => <option key={s} value={s}>{ST[s].label}</option>)}</select></Field>}
      <Field label="Observações"><input style={inp} value={f.obs ?? ''} onChange={(e) => set('obs', e.target.value)} /></Field>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
