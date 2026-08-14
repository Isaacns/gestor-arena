import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Professional, ProfFuncao } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const FUNCOES: { v: ProfFuncao; label: string }[] = [
  { v: 'professor', label: 'Professor(a)' }, { v: 'coordenador', label: 'Coordenador(a)' },
  { v: 'recepcao', label: 'Recepção' }, { v: 'auxiliar', label: 'Auxiliar' },
]
const rotuloFuncao = (f: ProfFuncao) => FUNCOES.find((x) => x.v === f)?.label ?? f

export default function Professores() {
  const { org, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Professional[]>([])
  const [edit, setEdit] = useState<Partial<Professional> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'coordenador'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('professionals').select('*').eq('org_id', org.id).order('nome')
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as Professional[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{lista.length} profissional(is)</span>
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo profissional</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : lista.length === 0 ? (
          <Empty ico="👤" titulo="Nenhum profissional" texto="Cadastre professores e a equipe da escola. Depois vincule cada turma ao seu professor.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar profissional</button>}
          </Empty>
        ) : (
          <div className="ga-tablewrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Nome', 'Função', 'Contato', 'Situação', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{lista.map((p) => (
                <tr key={p.id}>
                  <td style={td}><b>{p.nome}</b></td>
                  <td style={td}>{rotuloFuncao(p.funcao)}</td>
                  <td style={td}>{[p.telefone, p.email].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={td}><Badge color={p.ativo ? '#16A34A' : '#94A3B8'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td style={{ ...td, textAlign: 'right' }}>{pode && <BtnSm onClick={() => setEdit(p)}>Editar</BtnSm>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarProf prof={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarProf({ prof, onClose, onSaved }: { prof: Partial<Professional>; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<Professional>>({ funcao: 'professor', ativo: true, ...prof })
  const [busy, setBusy] = useState(false)
  const editando = !!prof.id
  const set = <K extends keyof Professional>(k: K, v: Professional[K]) => setF((s) => ({ ...s, [k]: v }))

  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) return toast('Nome é obrigatório.', true)
    setBusy(true)
    const dados = { org_id: org.id, nome: f.nome.trim(), funcao: f.funcao ?? 'professor', telefone: f.telefone || null, email: f.email || null, ativo: f.ativo ?? true }
    const { error } = editando ? await sb.from('professionals').update(dados).eq('id', prof.id!) : await sb.from('professionals').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar profissional' : 'Novo profissional'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <Field label="Função"><select style={inp} value={f.funcao ?? 'professor'} onChange={(e) => set('funcao', e.target.value as ProfFuncao)}>
        {FUNCOES.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
      </select></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Telefone"><input style={inp} value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Field>
        <Field label="E-mail"><input style={inp} type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
      </div>
      {editando && <Field label="Situação"><select style={inp} value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativo</option><option value="0">Inativo</option></select></Field>}
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
