import { useRef, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, Field, Foot, Modal, PasswordInput, errMsg, inp, useToast } from '../ui/kit'

// Editar o próprio perfil (nome + foto + senha). Padrão VIZIO: acessível pelo menu do usuário no topo direito.
export default function Perfil({ onClose }: { onClose: () => void }) {
  const { user, reload } = useAuth()
  const toast = useToast()
  const [nome, setNome] = useState((user?.user_metadata?.nome as string | undefined) ?? '')
  const [foto, setFoto] = useState((user?.user_metadata?.foto_url as string | undefined) ?? '')
  const [novaSenha, setNovaSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [subindo, setSubindo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function subirFoto(file: File) {
    if (!user) return
    if (!file.type.startsWith('image/')) return toast('Selecione uma imagem.', true)
    if (file.size > 3 * 1024 * 1024) return toast('Imagem muito grande (máx. 3MB).', true)
    setSubindo(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/avatar_${Date.now()}.${ext}`
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
    if (error) { setSubindo(false); return toast(errMsg(error), true) }
    const { data } = sb.storage.from('avatars').getPublicUrl(path)
    setFoto(data.publicUrl)
    setSubindo(false)
    toast('Foto enviada. Clique em Salvar para aplicar.')
  }

  async function salvar() {
    if (!user) return
    if (!nome.trim()) return toast('Informe seu nome.', true)
    if (novaSenha && novaSenha.length < 8) return toast('A nova senha precisa de ao menos 8 caracteres.', true)
    setBusy(true)
    const attrs: { data: Record<string, unknown>; password?: string } = { data: { nome: nome.trim(), foto_url: foto.trim() || null } }
    if (novaSenha) attrs.password = novaSenha
    const { error: e1 } = await sb.auth.updateUser(attrs)
    const { error: e2 } = await sb.from('profiles').update({ nome: nome.trim(), foto_url: foto.trim() || null }).eq('id', user.id)
    setBusy(false)
    if (e1 || e2) return toast(errMsg(e1 || e2), true)
    await reload()
    toast(novaSenha ? 'Perfil e senha atualizados.' : 'Perfil atualizado.'); onClose()
  }

  const inicial = (nome.trim()[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  return (
    <Modal title="Meu perfil" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <span style={{ width: 64, height: 64, borderRadius: '50%', flex: 'none', background: foto ? `center/cover url(${foto})` : 'linear-gradient(135deg, var(--brand), var(--navy))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24 }}>
          {!foto && inicial}
        </span>
        <div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirFoto(f); e.target.value = '' }} />
          <button type="button" className="ga-btn" style={{ width: 'auto', height: 36 }} disabled={subindo} onClick={() => fileRef.current?.click()}>{subindo ? 'Enviando…' : '📷 Enviar foto'}</button>
          {foto && <button type="button" onClick={() => setFoto('')} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--tx3)', fontSize: 13, cursor: 'pointer' }}>Remover</button>}
        </div>
      </div>
      <Field label="Nome"><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Field label="E-mail"><input style={{ ...inp, opacity: .7 }} value={user?.email ?? ''} disabled /></Field>
      <Field label="Foto (URL, opcional)"><input style={inp} placeholder="https://…" value={foto} onChange={(e) => setFoto(e.target.value)} /></Field>
      <Field label="Nova senha (opcional, mín. 8)"><PasswordInput autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} /></Field>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </Foot>
    </Modal>
  )
}
