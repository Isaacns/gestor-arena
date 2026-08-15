import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { ExternalVenue } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

// Locais onde a escola dá aula sem ser quadra de arena parceira (praça, praia, ginásio alugado…)
export default function Locais() {
  const { org, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<ExternalVenue[]>([])
  const [edit, setEdit] = useState<Partial<ExternalVenue> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'coordenador'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('external_venues').select('*').eq('org_id', org.id).order('nome')
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as ExternalVenue[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{lista.length} local(is)</span>
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo local</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : lista.length === 0 ? (
          <Empty ico="📍" titulo="Nenhum local externo" texto="Cadastre praças, praias ou espaços alugados onde a escola dá aula. Depois você pode vincular a turma a um destes locais.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar local</button>}
          </Empty>
        ) : (
          <div className="ga-tablewrap">
            <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Nome', 'Endereço', 'Contato', 'Situação', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{lista.map((v) => (
                <tr key={v.id}>
                  <td style={td}><b>{v.nome}</b></td>
                  <td style={td}>{[v.endereco, v.cidade, v.uf].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={td}>{v.telefone || '—'}</td>
                  <td style={td}><Badge color={v.ativo ? '#16A34A' : '#94A3B8'}>{v.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td style={{ ...td, textAlign: 'right' }}>{pode && <BtnSm onClick={() => setEdit(v)}>Editar</BtnSm>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarLocal local={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarLocal({ local, onClose, onSaved }: { local: Partial<ExternalVenue>; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<ExternalVenue>>({ ativo: true, ...local })
  const [busy, setBusy] = useState(false)
  const editando = !!local.id
  const set = <K extends keyof ExternalVenue>(k: K, v: ExternalVenue[K]) => setF((s) => ({ ...s, [k]: v }))

  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) return toast('Nome é obrigatório.', true)
    setBusy(true)
    const dados = { org_id: org.id, nome: f.nome.trim(), endereco: f.endereco || null, cidade: f.cidade || null, uf: (f.uf || '').toUpperCase() || null, telefone: f.telefone || null, ativo: f.ativo ?? true }
    const { error } = editando ? await sb.from('external_venues').update(dados).eq('id', local.id!) : await sb.from('external_venues').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar local' : 'Novo local'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} placeholder="Ex.: Praia de Stella Maris" value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <Field label="Endereço"><input style={inp} value={f.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Cidade"><input style={inp} value={f.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} /></Field>
        <Field label="UF"><input style={inp} maxLength={2} value={f.uf ?? ''} onChange={(e) => set('uf', e.target.value)} /></Field>
      </div>
      <Field label="Telefone"><input style={inp} value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Field>
      {editando && <Field label="Situação"><select style={inp} value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativo</option><option value="0">Inativo</option></select></Field>}
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
