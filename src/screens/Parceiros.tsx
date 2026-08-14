import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Vinculo } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const chip = (s: Vinculo['status']) => s === 'ativo' ? <Badge color="#16A34A">Ativo</Badge> : s === 'pendente' ? <Badge color="#F59E0B">Pendente</Badge> : <Badge color="#94A3B8">{s}</Badge>

export default function Parceiros() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<Vinculo[]>([])
  const [convidar, setConvidar] = useState(false)
  const [config, setConfig] = useState<Vinculo | null>(null)
  const pode = ['owner', 'admin', 'gerente'].includes(role ?? '')
  const ehArena = org?.tipo === 'arena'

  async function carregar() {
    if (!org) return
    setLoading(true)
    const { data, error } = await sb.rpc('meus_vinculos', { p_org: org.id })
    if (error) toast(errMsg(error), true)
    setLinks(((data as Vinculo[]) ?? []).filter((l) => l.status !== 'encerrado')); setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  async function responder(id: string, acao: 'aceitar' | 'recusar' | 'encerrar') {
    if (acao === 'encerrar' && !confirm('Encerrar esta parceria? As reservas futuras compartilhadas serão canceladas e a agenda deixa de conversar.')) return
    if (acao === 'recusar' && !confirm('Recusar este convite de parceria?')) return
    const { error } = await sb.rpc('responder_vinculo', { p_link: id, p_acao: acao })
    if (error) return toast(errMsg(error), true)
    toast(acao === 'aceitar' ? 'Parceria ativa! 🎉' : 'Feito.'); void carregar()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{links.length} {ehArena ? 'escolinha(s)' : 'arena(s)'}</span>
        {pode && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setConvidar(true)}>Convidar parceiro</button>}
      </div>
      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : links.length === 0 ? (
          <Empty ico="🤝" titulo="Nenhum vínculo ainda" texto={ehArena ? 'Convide as escolinhas que alugam suas quadras — cada lado vê só o que a parceria compartilha.' : 'Convide as arenas onde você dá aula — a agenda de vocês passa a conversar.'}>
            {pode && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setConvidar(true)}>Convidar parceiro</button>}
          </Empty>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{[ehArena ? 'Escolinha' : 'Arena', 'Cidade', 'Agenda', 'Status', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{links.map((l) => (
              <tr key={l.id}>
                <td style={td}><b>{l.parceiro_nome}</b></td>
                <td style={td}>{[l.parceiro_cidade, l.parceiro_uf].filter(Boolean).join('/') || '—'}</td>
                <td style={td}>{l.status === 'ativo' ? (l.compartilha_agenda ? <Badge color="#16A34A">Compartilhada</Badge> : <span style={{ fontSize: 12, color: 'var(--tx3)' }}>—</span>) : '—'}</td>
                <td style={td}>{chip(l.status)}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {pode && l.status === 'pendente' && !l.eu_criei && <>
                    <BtnSm onClick={() => void responder(l.id, 'aceitar')} style={{ marginRight: 6 }}>Aceitar</BtnSm>
                    <BtnSm danger onClick={() => void responder(l.id, 'recusar')}>Recusar</BtnSm>
                  </>}
                  {pode && l.status === 'pendente' && l.eu_criei && <span style={{ fontSize: 12, color: 'var(--tx3)' }}>aguardando</span>}
                  {pode && l.status === 'ativo' && <>
                    <BtnSm onClick={() => setConfig(l)} style={{ marginRight: 6 }}>Configurar</BtnSm>
                    <BtnSm danger onClick={() => void responder(l.id, 'encerrar')}>Encerrar</BtnSm>
                  </>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div className="ga-card" style={{ marginTop: 16 }}>
        <b>Seu código de parceria</b>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, background: 'var(--bg2)', border: '1px dashed var(--line2)', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: 'var(--brand)' }}>{org?.slug}</code>
          <BtnSm onClick={() => { navigator.clipboard?.writeText(org?.slug ?? ''); toast('Código copiado.') }}>Copiar</BtnSm>
        </div>
      </div>
      {convidar && <Convidar ehArena={ehArena} onClose={() => setConvidar(false)} onSaved={() => { setConvidar(false); void carregar() }} />}
      {config && <Configurar link={config} ehArena={ehArena} onClose={() => setConfig(null)} onSaved={() => { setConfig(null); void carregar() }} />}
    </div>
  )
}

function Convidar({ ehArena, onClose, onSaved }: { ehArena: boolean; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [slug, setSlug] = useState(''); const [busy, setBusy] = useState(false)
  async function enviar() {
    if (!org || !slug.trim()) return toast('Cole o código de parceria.', true)
    setBusy(true)
    const { error } = await sb.rpc('solicitar_vinculo', { p_minha_org: org.id, p_slug_alvo: slug.trim() })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Convite enviado. O outro lado precisa aceitar.'); onSaved()
  }
  return (
    <Modal title={`Convidar ${ehArena ? 'escolinha' : 'arena'}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 14 }}>Peça o <b>código de parceria</b> do outro lado (aparece no Parceiros dele) e cole aqui.</p>
      <Field label="Código de parceria"><input style={inp} placeholder="ex.: escolinha-joao-a1b2c3" value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void enviar()}>Enviar convite</button></Foot>
    </Modal>
  )
}

function Configurar({ link, ehArena, onClose, onSaved }: { link: Vinculo; ehArena: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [agenda, setAgenda] = useState(link.compartilha_agenda)
  const [contatos, setContatos] = useState(link.compartilha_contatos)
  const [busy, setBusy] = useState(false)
  async function salvar() {
    setBusy(true)
    const { error } = await sb.rpc('configurar_vinculo', { p_link: link.id, p_compartilha_agenda: agenda, p_compartilha_contatos: contatos })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Parceria configurada.'); onSaved()
  }
  return (
    <Modal title={`Parceria — ${link.parceiro_nome}`} onClose={onClose}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 14 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={agenda} onChange={(e) => setAgenda(e.target.checked)} disabled={!ehArena} />
        <span>Agenda compartilhada {!ehArena && <em style={{ color: 'var(--tx3)', fontSize: 12 }}>(só a arena liga)</em>}</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 14 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={contatos} onChange={(e) => setContatos(e.target.checked)} />
        <span>Compartilhar contatos (telefone/e-mail)</span>
      </label>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>Salvar</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
