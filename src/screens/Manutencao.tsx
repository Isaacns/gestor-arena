import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

type MStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'
interface Ordem { id: string; org_id: string; court_id: string | null; titulo: string; descricao: string | null; prioridade: string; status: MStatus }
const ST: Record<MStatus, { label: string; chip: string }> = {
  aberta: { label: 'Aberta', chip: 'ga-chip-warn' }, em_andamento: { label: 'Em andamento', chip: 'ga-chip-info' },
  concluida: { label: 'Concluída', chip: 'ga-chip-ok' }, cancelada: { label: 'Cancelada', chip: 'ga-chip-muted' },
}
const PRIO: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }

export default function Manutencao() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Ordem[]>([])
  const [quadras, setQuadras] = useState<{ id: string; nome: string }[]>([])
  const [edit, setEdit] = useState<Partial<Ordem> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'operacional'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true); setErro(false)
    const [o, q] = await Promise.all([
      sb.from('maintenance_orders').select('*').eq('org_id', org.id).order('aberta_em', { ascending: false }),
      sb.from('courts').select('id, nome').eq('org_id', org.id).eq('ativo', true).order('nome'),
    ])
    if (o.error) { setErro(true); setLoading(false); return }
    setLista((o.data as Ordem[]) ?? []); setQuadras((q.data as { id: string; nome: string }[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])
  const nomeQuadra = (id: string | null) => quadras.find((c) => c.id === id)?.nome ?? '—'

  async function mudar(o: Ordem, status: MStatus) {
    const { error } = await sb.from('maintenance_orders').update({ status, concluida_em: status === 'concluida' ? new Date().toISOString() : null }).eq('id', o.id)
    if (error) return toast(errMsg(error), true)
    toast('Status atualizado.'); void carregar()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{lista.filter((o) => o.status === 'aberta' || o.status === 'em_andamento').length} em aberto</span>
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Abrir chamado</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : lista.length === 0 ? (
          <Empty ico="🔧" titulo="Nenhum chamado" texto="Abra chamados de manutenção das quadras e do espaço para não perder reserva por quadra parada.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Abrir chamado</button>}
          </Empty>
        ) : (
          <div className="ga-tablewrap">
            <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Chamado', 'Quadra', 'Prioridade', 'Status', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{lista.map((o) => (
                <tr key={o.id}>
                  <td style={td}><b>{o.titulo}</b>{o.descricao && <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{o.descricao}</div>}</td>
                  <td style={td}>{nomeQuadra(o.court_id)}</td>
                  <td style={td}>{PRIO[o.prioridade] ?? o.prioridade}</td>
                  <td style={td}><span className={'ga-chip ' + ST[o.status].chip}>{ST[o.status].label}</span></td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {pode && o.status === 'aberta' && <BtnSm onClick={() => void mudar(o, 'em_andamento')} style={{ marginRight: 6 }}>Iniciar</BtnSm>}
                    {pode && (o.status === 'aberta' || o.status === 'em_andamento') && <BtnSm onClick={() => void mudar(o, 'concluida')} style={{ marginRight: 6 }}>Concluir</BtnSm>}
                    {pode && <BtnSm onClick={() => setEdit(o)}>Editar</BtnSm>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarOrdem ordem={edit} quadras={quadras} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarOrdem({ ordem, quadras, onClose, onSaved }: { ordem: Partial<Ordem>; quadras: { id: string; nome: string }[]; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<Ordem>>({ prioridade: 'media', status: 'aberta', ...ordem })
  const [busy, setBusy] = useState(false)
  const editando = !!ordem.id
  const set = <K extends keyof Ordem>(k: K, v: Ordem[K]) => setF((s) => ({ ...s, [k]: v }))
  async function salvar() {
    if (!org) return
    if (!f.titulo?.trim()) return toast('Informe o título do chamado.', true)
    setBusy(true)
    const dados = { org_id: org.id, court_id: f.court_id || null, titulo: f.titulo.trim(), descricao: f.descricao || null, prioridade: f.prioridade || 'media', status: f.status || 'aberta' }
    const { error } = editando ? await sb.from('maintenance_orders').update(dados).eq('id', ordem.id!) : await sb.from('maintenance_orders').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }
  return (
    <Modal title={editando ? 'Editar chamado' : 'Novo chamado'} onClose={onClose}>
      <Field label="Título *"><input style={inp} placeholder="Ex.: Rede da quadra 2 rasgada" value={f.titulo ?? ''} onChange={(e) => set('titulo', e.target.value)} /></Field>
      <Field label="Descrição"><input style={inp} value={f.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Quadra"><select style={inp} value={f.court_id ?? ''} onChange={(e) => set('court_id', e.target.value || null)}><option value="">— geral —</option>{quadras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
        <Field label="Prioridade"><select style={inp} value={f.prioridade ?? 'media'} onChange={(e) => set('prioridade', e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></Field>
      </div>
      {editando && <Field label="Status"><select style={inp} value={f.status ?? 'aberta'} onChange={(e) => set('status', e.target.value as MStatus)}>{(Object.keys(ST) as MStatus[]).map((s) => <option key={s} value={s}>{ST[s].label}</option>)}</select></Field>}
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
