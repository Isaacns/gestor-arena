import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { AppRole, MembershipRow } from '../lib/database.types'
import { BtnGhost, BtnSm, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const PAPEIS: AppRole[] = ['admin', 'gerente', 'financeiro', 'recepcao', 'operacional', 'coordenador', 'professor', 'visualizador']
const ROTULO: Record<string, string> = { owner: 'Proprietário', admin: 'Administrador', gerente: 'Gerente', financeiro: 'Financeiro', recepcao: 'Recepção', operacional: 'Operacional', coordenador: 'Coordenador', professor: 'Professor', visualizador: 'Visualizador' }

export default function Equipe() {
  const { org, user, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [lista, setLista] = useState<MembershipRow[]>([])
  const [add, setAdd] = useState(false)
  const [link, setLink] = useState(false)
  const [editar, setEditar] = useState<MembershipRow | null>(null)
  const podeAdmin = ['owner', 'admin'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true)
    const { data, error } = await sb.from('memberships').select('user_id, role, ativo, profiles:user_id(nome, email, foto_url)').eq('org_id', org.id).eq('ativo', true).order('criado_em')
    if (error) toast(errMsg(error), true)
    setLista((data as unknown as MembershipRow[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  async function remover(userId: string, quem?: string) {
    if (!org) return
    if (!confirm(`Remover ${quem ?? 'esta pessoa'} da equipe? Ela perde o acesso a esta organização.`)) return
    const { error } = await sb.rpc('remover_membro', { p_org: org.id, p_user: userId })
    if (error) return toast(errMsg(error), true)
    toast('Acesso removido.'); void carregar()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{lista.length} pessoa(s)</span>
        {podeAdmin && <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <BtnSm onClick={() => setLink(true)}>🔗 Convidar por link</BtnSm>
          <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setAdd(true)}>Adicionar pessoa</button>
        </div>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : (
          <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Nome', 'E-mail', 'Papel', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{lista.map((m) => (
              <tr key={m.user_id}>
                <td style={td}><b>{m.profiles?.nome ?? m.profiles?.email ?? m.user_id.slice(0, 8)}</b>{m.user_id === user?.id && <span style={{ fontSize: 11, color: 'var(--tx3)' }}> (você)</span>}</td>
                <td style={td}>{m.profiles?.email ?? '—'}</td>
                <td style={td}>{ROTULO[m.role] ?? m.role}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {podeAdmin && m.user_id !== user?.id && m.role !== 'owner' && <>
                    <BtnSm onClick={() => setEditar(m)} style={{ marginRight: 6 }}>Papel</BtnSm>
                    <BtnSm danger onClick={() => void remover(m.user_id, m.profiles?.nome ?? m.profiles?.email ?? undefined)}>Remover</BtnSm>
                  </>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {add && <AddMembro onClose={() => setAdd(false)} onSaved={() => { setAdd(false); void carregar() }} />}
      {link && <ConvidarLink onClose={() => setLink(false)} />}
      {editar && <EditarPapel membro={editar} onClose={() => setEditar(null)} onSaved={() => { setEditar(null); void carregar() }} />}
    </div>
  )
}

function AddMembro({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [email, setEmail] = useState(''); const [papel, setPapel] = useState<AppRole>('visualizador'); const [busy, setBusy] = useState(false)
  async function salvar() {
    if (!org || !email.trim()) return toast('Informe o e-mail.', true)
    setBusy(true)
    const { error } = await sb.rpc('adicionar_membro', { p_org: org.id, p_email: email.trim(), p_role: papel })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Pessoa adicionada.'); onSaved()
  }
  return (
    <Modal title="Adicionar pessoa" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 14 }}>A pessoa precisa <b>já ter conta</b> no Gestor Arena (basta criar grátis na tela de entrada).</p>
      <Field label="E-mail"><input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Papel"><select style={inp} value={papel} onChange={(e) => setPapel(e.target.value as AppRole)}>{PAPEIS.map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}</select></Field>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>Adicionar</button></Foot>
    </Modal>
  )
}

function EditarPapel({ membro, onClose, onSaved }: { membro: MembershipRow; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [papel, setPapel] = useState<AppRole>(membro.role); const [busy, setBusy] = useState(false)
  async function salvar() {
    if (!org) return
    setBusy(true)
    const { error } = await sb.rpc('alterar_papel_membro', { p_org: org.id, p_user: membro.user_id, p_role: papel })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Papel atualizado.'); onSaved()
  }
  return (
    <Modal title={`Papel de ${membro.profiles?.nome ?? 'membro'}`} onClose={onClose}>
      <Field label="Papel"><select style={inp} value={papel} onChange={(e) => setPapel(e.target.value as AppRole)}>{PAPEIS.map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}</select></Field>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>Salvar</button></Foot>
    </Modal>
  )
}
function ConvidarLink({ onClose }: { onClose: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [papel, setPapel] = useState<AppRole>('admin')
  const [email, setEmail] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  async function gerar() {
    if (!org) return
    setBusy(true)
    const { data, error } = await sb.rpc('criar_convite', { p_org: org.id, p_role: papel, p_email: email.trim() || null, p_expira_dias: 14 })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    setLink(`${window.location.origin}/?convite=${data}`)
  }
  return (
    <Modal title="Convidar por link" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 4 }}>
        Gere um link de acesso para <b>{org?.nome}</b>. Quem abrir define a senha e entra <b>só nesta organização</b>.
      </p>
      {!link ? (
        <>
          <Field label="Papel de acesso"><select style={inp} value={papel} onChange={(e) => setPapel(e.target.value as AppRole)}>
            {(['owner', ...PAPEIS] as AppRole[]).map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
          </select></Field>
          <Field label="Restringir a um e-mail (opcional)"><input style={inp} type="email" placeholder="deixe vazio para link aberto" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void gerar()}>{busy ? 'Gerando…' : 'Gerar link'}</button></Foot>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <code style={{ flex: 1, minWidth: 0, background: 'var(--bg2)', border: '1px dashed var(--line2)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--brand)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</code>
            <BtnSm onClick={() => { navigator.clipboard?.writeText(link); toast('Link copiado.') }}>Copiar</BtnSm>
          </div>
          <p style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 10 }}>Válido por 14 dias e de uso único. Envie por WhatsApp/e-mail para a pessoa.</p>
          <Foot><button className="ga-btn" style={{ width: 'auto' }} onClick={onClose}>Concluir</button></Foot>
        </>
      )}
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
