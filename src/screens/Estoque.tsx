import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Badge, BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

interface Item { id: string; org_id: string; nome: string; categoria: string | null; unidade: string; quantidade: number; minimo: number; ativo: boolean }

export default function Estoque() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Item[]>([])
  const [edit, setEdit] = useState<Partial<Item> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'operacional', 'recepcao'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('inventory_items').select('*').eq('org_id', org.id).order('nome')
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as Item[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  async function ajustar(it: Item, delta: number) {
    const q = Math.max(0, Number(it.quantidade) + delta)
    const { error } = await sb.from('inventory_items').update({ quantidade: q }).eq('id', it.id)
    if (error) return toast(errMsg(error), true)
    setLista((s) => s.map((x) => x.id === it.id ? { ...x, quantidade: q } : x))
  }
  const baixo = lista.filter((i) => i.ativo && Number(i.quantidade) <= Number(i.minimo)).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{lista.length} item(ns)</span>
        {baixo > 0 && <span className="ga-chip ga-chip-warn">{baixo} com estoque baixo</span>}
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo item</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : lista.length === 0 ? (
          <Empty ico="📦" titulo="Estoque vazio" texto="Cadastre materiais esportivos, itens de bar/lanchonete ou uniformes e controle a quantidade.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar item</button>}
          </Empty>
        ) : (
          <div className="ga-tablewrap">
            <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Item', 'Categoria', 'Quantidade', 'Situação', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{lista.map((i) => {
                const low = i.ativo && Number(i.quantidade) <= Number(i.minimo)
                return (
                  <tr key={i.id}>
                    <td style={td}><b>{i.nome}</b></td>
                    <td style={td}>{i.categoria || '—'}</td>
                    <td style={td}>
                      {pode && <BtnSm onClick={() => void ajustar(i, -1)} style={{ marginRight: 6 }}>−</BtnSm>}
                      <b>{Number(i.quantidade)}</b> <span style={{ color: 'var(--tx3)' }}>{i.unidade}</span>
                      {pode && <BtnSm onClick={() => void ajustar(i, 1)} style={{ marginLeft: 6 }}>+</BtnSm>}
                    </td>
                    <td style={td}>{low ? <Badge color="#F59E0B">Baixo (mín. {Number(i.minimo)})</Badge> : <Badge color="#16A34A">OK</Badge>}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{pode && <BtnSm onClick={() => setEdit(i)}>Editar</BtnSm>}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarItem item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarItem({ item, onClose, onSaved }: { item: Partial<Item>; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<Item>>({ unidade: 'un', quantidade: 0, minimo: 0, ativo: true, ...item })
  const [busy, setBusy] = useState(false)
  const editando = !!item.id
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setF((s) => ({ ...s, [k]: v }))
  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) return toast('Nome é obrigatório.', true)
    setBusy(true)
    const dados = { org_id: org.id, nome: f.nome.trim(), categoria: f.categoria || null, unidade: f.unidade || 'un', quantidade: Number(f.quantidade) || 0, minimo: Number(f.minimo) || 0, ativo: f.ativo ?? true }
    const { error } = editando ? await sb.from('inventory_items').update(dados).eq('id', item.id!) : await sb.from('inventory_items').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }
  return (
    <Modal title={editando ? 'Editar item' : 'Novo item'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Categoria"><input style={inp} placeholder="Material, bar, uniforme…" value={f.categoria ?? ''} onChange={(e) => set('categoria', e.target.value)} /></Field>
        <Field label="Unidade"><input style={inp} value={f.unidade ?? 'un'} onChange={(e) => set('unidade', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Quantidade"><input type="number" step="1" style={inp} value={f.quantidade ?? 0} onChange={(e) => set('quantidade', Number(e.target.value))} /></Field>
        <Field label="Estoque mínimo"><input type="number" step="1" style={inp} value={f.minimo ?? 0} onChange={(e) => set('minimo', Number(e.target.value))} /></Field>
      </div>
      {editando && <Field label="Situação"><select style={inp} value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativo</option><option value="0">Inativo</option></select></Field>}
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
