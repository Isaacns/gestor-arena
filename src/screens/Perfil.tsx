import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, Field, Foot, Modal, PasswordInput, errMsg, inp, useToast } from '../ui/kit'

// Editar o próprio perfil (nome + foto). Padrão VIZIO: acessível pelo menu do usuário no topo direito.
export default function Perfil({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [nome, setNome] = useState((user?.user_metadata?.nome as string | undefined) ?? '')
  const [foto, setFoto] = useState((user?.user_metadata?.foto_url as string | undefined) ?? '')
  const [novaSenha, setNovaSenha] = useState('')
  const [busy, setBusy] = useState(false)

  async function salvar() {
    if (!user) return
    if (!nome.trim()) return toast('Informe seu nome.', true)
    if (novaSenha && novaSenha.length < 8) return toast('A nova senha precisa de ao menos 8 caracteres.', true)
    setBusy(true)
    // metadados do auth (alimentam o cabeçalho) + tabela profiles (alimenta a Equipe) + senha opcional
    const attrs: { data: Record<string, unknown>; password?: string } = { data: { nome: nome.trim(), foto_url: foto.trim() || null } }
    if (novaSenha) attrs.password = novaSenha
    const { error: e1 } = await sb.auth.updateUser(attrs)
    const { error: e2 } = await sb.from('profiles').update({ nome: nome.trim(), foto_url: foto.trim() || null }).eq('id', user.id)
    setBusy(false)
    if (e1 || e2) return toast(errMsg(e1 || e2), true)
    toast(novaSenha ? 'Perfil e senha atualizados.' : 'Perfil atualizado.'); onClose()
  }

  return (
    <Modal title="Meu perfil" onClose={onClose}>
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
