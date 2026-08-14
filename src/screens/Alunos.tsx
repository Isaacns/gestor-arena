import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { AlunoSituacao, Student } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const SITU: Record<AlunoSituacao, { label: string; cor: string }> = {
  lead: { label: 'Lead', cor: '#0284C7' },
  experimental: { label: 'Experimental', cor: '#38BDF8' },
  ativo: { label: 'Ativo', cor: '#16A34A' },
  pausado: { label: 'Pausado', cor: '#F59E0B' },
  cancelado: { label: 'Cancelado', cor: '#94A3B8' },
  arquivado: { label: 'Ex-aluno', cor: '#64748B' },
}
const ORDEM: AlunoSituacao[] = ['lead', 'experimental', 'ativo', 'pausado', 'cancelado', 'arquivado']

export default function Alunos() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [lista, setLista] = useState<Student[]>([])
  const [filtro, setFiltro] = useState<AlunoSituacao | 'todos'>('todos')
  const [edit, setEdit] = useState<Partial<Student> | null>(null)
  const podeEditar = ['owner', 'admin', 'gerente', 'coordenador', 'recepcao'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true)
    const { data, error } = await sb.from('students').select('*').eq('org_id', org.id).order('nome')
    if (error) toast(errMsg(error), true)
    setLista((data as Student[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  const visiveis = filtro === 'todos' ? lista : lista.filter((s) => s.situacao === filtro)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as AlunoSituacao | 'todos')} style={{ ...inp, width: 'auto' }}>
          <option value="todos">Todas as situações</option>
          {ORDEM.map((s) => <option key={s} value={s}>{SITU[s].label}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{visiveis.length} aluno(s)</span>
        {podeEditar && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo aluno</button>}
      </div>

      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : visiveis.length === 0 ? (
          <Empty ico="🎓" titulo="Nenhum aluno" texto="Cadastre alunos e acompanhe o funil: lead → experimental → ativo.">
            {podeEditar && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar aluno</button>}
          </Empty>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Nome', 'Contato', 'Nível', 'Situação', ''].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {visiveis.map((s) => (
                <tr key={s.id}>
                  <td style={td}><b>{s.nome}</b></td>
                  <td style={td}>{s.telefone ?? s.responsavel ?? '—'}</td>
                  <td style={td}>{s.nivel ?? '—'}</td>
                  <td style={td}><Badge color={SITU[s.situacao].cor}>{SITU[s.situacao].label}</Badge></td>
                  <td style={{ ...td, textAlign: 'right' }}>{podeEditar && <BtnSm onClick={() => setEdit(s)}>Editar</BtnSm>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && <EditarAluno aluno={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarAluno({ aluno, onClose, onSaved }: { aluno: Partial<Student>; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth()
  const toast = useToast()
  const [f, setF] = useState<Partial<Student>>({ situacao: 'lead', ...aluno })
  const [busy, setBusy] = useState(false)
  const editando = !!aluno.id
  function set<K extends keyof Student>(k: K, v: Student[K]) { setF((s) => ({ ...s, [k]: v })) }

  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) { toast('Informe o nome.', true); return }
    setBusy(true)
    const dados = {
      org_id: org.id, nome: f.nome.trim(),
      telefone: f.telefone || null, responsavel: f.responsavel || null,
      responsavel_telefone: f.responsavel_telefone || null, nivel: f.nivel || null,
      situacao: f.situacao ?? 'lead', origem: f.origem || null, obs: f.obs || null,
    }
    const { error } = editando
      ? await sb.from('students').update(dados).eq('id', aluno.id!)
      : await sb.from('students').insert(dados)
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast(editando ? 'Aluno atualizado.' : 'Aluno cadastrado.')
    onSaved()
  }

  return (
    <Modal title={editando ? 'Editar aluno' : 'Novo aluno'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Telefone"><input style={inp} value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Field>
        <Field label="Nível"><input style={inp} placeholder="iniciante…" value={f.nivel ?? ''} onChange={(e) => set('nivel', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Responsável"><input style={inp} value={f.responsavel ?? ''} onChange={(e) => set('responsavel', e.target.value)} /></Field>
        <Field label="Tel. responsável"><input style={inp} value={f.responsavel_telefone ?? ''} onChange={(e) => set('responsavel_telefone', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Situação">
          <select style={inp} value={f.situacao ?? 'lead'} onChange={(e) => set('situacao', e.target.value as AlunoSituacao)}>
            {ORDEM.map((s) => <option key={s} value={s}>{SITU[s].label}</option>)}
          </select>
        </Field>
        <Field label="Origem (lead)"><input style={inp} placeholder="Indicação, Instagram…" value={f.origem ?? ''} onChange={(e) => set('origem', e.target.value)} /></Field>
      </div>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </Foot>
    </Modal>
  )
}

const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
