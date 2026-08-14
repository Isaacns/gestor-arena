import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Unit } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

export default function Unidades() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [lista, setLista] = useState<Unit[]>([])
  const [edit, setEdit] = useState<Partial<Unit> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'operacional'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true)
    const { data, error } = await sb.from('units').select('*').eq('org_id', org.id).order('criado_em')
    if (error) toast(errMsg(error), true)
    setLista((data as Unit[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{lista.length} unidade(s)</span>
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Nova unidade</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : lista.length === 0 ? (
          <Empty ico="📍" titulo="Nenhuma unidade" texto="Unidade é o endereço físico da Arena. Cadastre a primeira para depois criar as quadras.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar unidade</button>}
          </Empty>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Nome', 'Endereço', 'Situação', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{lista.map((u) => (
              <tr key={u.id}>
                <td style={td}><b>{u.nome}</b></td>
                <td style={td}>{[u.endereco, u.cidade, u.uf].filter(Boolean).join(' · ') || '—'}</td>
                <td style={td}><Badge color={u.ativo ? '#16A34A' : '#94A3B8'}>{u.ativo ? 'Ativa' : 'Inativa'}</Badge></td>
                <td style={{ ...td, textAlign: 'right' }}>{pode && <BtnSm onClick={() => setEdit(u)}>Editar</BtnSm>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {edit && <EditarUnidade unidade={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarUnidade({ unidade, onClose, onSaved }: { unidade: Partial<Unit>; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<Unit>>({ ativo: true, ...unidade })
  const [busy, setBusy] = useState(false)
  const editando = !!unidade.id
  const set = <K extends keyof Unit>(k: K, v: Unit[K]) => setF((s) => ({ ...s, [k]: v }))

  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) return toast('Nome é obrigatório.', true)
    setBusy(true)
    const dados = { org_id: org.id, nome: f.nome.trim(), endereco: f.endereco || null, cidade: f.cidade || null, uf: (f.uf || '').toUpperCase() || null, ativo: f.ativo ?? true }
    const { error } = editando ? await sb.from('units').update(dados).eq('id', unidade.id!) : await sb.from('units').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar unidade' : 'Nova unidade'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <Field label="Endereço"><input style={inp} value={f.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Cidade"><input style={inp} value={f.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} /></Field>
        <Field label="UF"><input style={inp} maxLength={2} value={f.uf ?? ''} onChange={(e) => set('uf', e.target.value)} /></Field>
      </div>
      {editando && <Field label="Situação"><select style={inp} value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativa</option><option value="0">Inativa</option></select></Field>}
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
