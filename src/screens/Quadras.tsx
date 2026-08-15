import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Court, Sport, Unit } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

export default function Quadras() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [courts, setCourts] = useState<Court[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [edit, setEdit] = useState<Partial<Court> | null>(null)
  const pode = ['owner', 'admin', 'gerente', 'operacional'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true)
    const [c, u, s] = await Promise.all([
      sb.from('courts').select('*').eq('org_id', org.id).order('criado_em'),
      sb.from('units').select('*').eq('org_id', org.id).eq('ativo', true).order('nome'),
      sb.from('sports').select('*').eq('ativo', true).order('nome'),
    ])
    if (c.error || u.error || s.error) toast(errMsg(c.error || u.error || s.error), true)
    setCourts((c.data as Court[]) ?? []); setUnits((u.data as Unit[]) ?? []); setSports((s.data as Sport[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])
  const nomeUnit = (id: string) => units.find((u) => u.id === id)?.nome ?? '—'
  const nomeSport = (id: string | null) => sports.find((s) => s.id === id)?.nome ?? '—'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{courts.length} quadra(s)</span>
        {pode && units.length > 0 && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Nova quadra</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : units.length === 0 ? (
          <Empty ico="📍" titulo="Antes, cadastre uma unidade" texto="Toda quadra pertence a uma unidade (o endereço da Arena)." />
        ) : courts.length === 0 ? (
          <Empty ico="🥅" titulo="Nenhuma quadra" texto="Cadastre suas quadras com a modalidade de cada uma.">
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar quadra</button>}
          </Empty>
        ) : (
          <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Quadra', 'Unidade', 'Modalidade', 'Estrutura', 'Situação', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{courts.map((c) => (
              <tr key={c.id}>
                <td style={td}><b>{c.nome}</b></td>
                <td style={td}>{nomeUnit(c.unit_id)}</td>
                <td style={td}>{nomeSport(c.sport_id)}</td>
                <td style={td}>{[c.coberta && 'coberta', c.iluminacao && 'iluminação'].filter(Boolean).join(' · ') || '—'}</td>
                <td style={td}><Badge color={c.ativo ? '#16A34A' : '#94A3B8'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge></td>
                <td style={{ ...td, textAlign: 'right' }}>{pode && <BtnSm onClick={() => setEdit(c)}>Editar</BtnSm>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {edit && <EditarQuadra quadra={edit} units={units} sports={sports} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarQuadra({ quadra, units, sports, onClose, onSaved }: { quadra: Partial<Court>; units: Unit[]; sports: Sport[]; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [f, setF] = useState<Partial<Court>>({ ativo: true, coberta: false, iluminacao: false, unit_id: units[0]?.id, ...quadra })
  const [busy, setBusy] = useState(false)
  const editando = !!quadra.id
  const set = <K extends keyof Court>(k: K, v: Court[K]) => setF((s) => ({ ...s, [k]: v }))

  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) return toast('Nome é obrigatório.', true)
    setBusy(true)
    const dados = { org_id: org.id, nome: f.nome.trim(), unit_id: f.unit_id, sport_id: f.sport_id || null, capacidade: f.capacidade || null, coberta: !!f.coberta, iluminacao: !!f.iluminacao, obs: f.obs || null, ativo: f.ativo ?? true }
    const { error } = editando ? await sb.from('courts').update(dados).eq('id', quadra.id!) : await sb.from('courts').insert(dados)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Salvo.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar quadra' : 'Nova quadra'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} placeholder="Ex.: Quadra 01" value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Unidade *"><select style={inp} value={f.unit_id} onChange={(e) => set('unit_id', e.target.value)}>{units.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></Field>
        <Field label="Modalidade"><select style={inp} value={f.sport_id ?? ''} onChange={(e) => set('sport_id', e.target.value || null)}><option value="">—</option>{sports.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
        <Field label="Capacidade"><input style={inp} type="number" min={1} value={f.capacidade ?? ''} onChange={(e) => set('capacidade', e.target.value ? Number(e.target.value) : null)} /></Field>
        <div style={{ display: 'flex', gap: 14, paddingBottom: 16 }}>
          <label style={{ display: 'flex', gap: 6, fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.coberta} onChange={(e) => set('coberta', e.target.checked)} />Coberta</label>
          <label style={{ display: 'flex', gap: 6, fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.iluminacao} onChange={(e) => set('iluminacao', e.target.checked)} />Iluminação</label>
        </div>
      </div>
      {editando && <Field label="Situação"><select style={inp} value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativa</option><option value="0">Inativa</option></select></Field>}
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
