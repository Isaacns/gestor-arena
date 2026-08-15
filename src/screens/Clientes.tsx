import { useEffect, useMemo, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Badge, BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

interface Customer { id: string; org_id: string; nome: string; telefone: string | null; email: string | null; documento: string | null; obs: string | null; ativo: boolean }

export default function Clientes() {
  const { org, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Customer[]>([])
  const [busca, setBusca] = useState('')
  const [edit, setEdit] = useState<Partial<Customer> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'recepcao', 'operacional'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('customers').select('*').eq('org_id', org.id).order('nome')
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as Customer[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return t ? lista.filter((c) => c.nome.toLowerCase().includes(t) || (c.telefone ?? '').includes(t) || (c.documento ?? '').includes(t)) : lista
  }, [lista, busca])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input style={{ ...inp, width: 'auto', flex: '1 1 220px', maxWidth: 320 }} placeholder="Buscar por nome, telefone, documento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{visiveis.length} cliente(s)</span>
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo cliente</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : visiveis.length === 0 ? (
          <Empty ico="🧑" titulo="Nenhum cliente" texto="Cadastre quem aluga suas quadras (avulso, mensalista, contrato). O cliente conecta com as contas a receber do Financeiro.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar cliente</button>}
          </Empty>
        ) : (
          <div className="ga-tablewrap">
            <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Nome', 'Contato', 'Documento', 'Situação', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{visiveis.map((c) => (
                <tr key={c.id}>
                  <td style={td}><b>{c.nome}</b></td>
                  <td style={td}>{[c.telefone, c.email].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={td}>{c.documento || '—'}</td>
                  <td style={td}><Badge color={c.ativo ? '#16A34A' : '#94A3B8'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td style={{ ...td, textAlign: 'right' }}>{pode && <BtnSm onClick={() => setEdit(c)}>Editar</BtnSm>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarCliente cliente={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarCliente({ cliente, onClose, onSaved }: { cliente: Partial<Customer>; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<Customer>>({ ativo: true, ...cliente })
  const [busy, setBusy] = useState(false)
  const editando = !!cliente.id
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setF((s) => ({ ...s, [k]: v }))

  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) return toast('Nome é obrigatório.', true)
    setBusy(true)
    const dados = { org_id: org.id, nome: f.nome.trim(), telefone: f.telefone || null, email: f.email || null, documento: f.documento || null, obs: f.obs || null, ativo: f.ativo ?? true }
    const { error } = editando ? await sb.from('customers').update(dados).eq('id', cliente.id!) : await sb.from('customers').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Telefone (WhatsApp)"><input style={inp} value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Field>
        <Field label="E-mail"><input style={inp} type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
      </div>
      <Field label="CPF/CNPJ (para cobrança)"><input style={inp} value={f.documento ?? ''} onChange={(e) => set('documento', e.target.value)} /></Field>
      <Field label="Observações"><input style={inp} value={f.obs ?? ''} onChange={(e) => set('obs', e.target.value)} /></Field>
      {editando && <Field label="Situação"><select style={inp} value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativo</option><option value="0">Inativo</option></select></Field>}
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
