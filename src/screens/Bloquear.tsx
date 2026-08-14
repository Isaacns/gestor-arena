import { useState, type FormEvent } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { PasswordInput } from '../ui/kit'
import { Logo } from '../ui/Logo'

// Tela bloqueada — mantém a sessão, exige a senha para voltar. Acionada pelo menu do usuário.
export default function Bloquear({ onUnlock }: { onUnlock: () => void }) {
  const { user, signOut } = useAuth()
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function desbloquear(e: FormEvent) {
    e.preventDefault(); setErro(null); setBusy(true)
    const { error } = await sb.auth.signInWithPassword({ email: user?.email ?? '', password: senha })
    setBusy(false)
    if (error) { setErro('Senha incorreta.'); return }
    onUnlock()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--navy)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="ga-aura" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div className="ga-float" style={{ display: 'inline-flex', marginBottom: 18, color: '#fff' }}><Logo size={40} /></div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 18, padding: '28px 24px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 30, marginBottom: 6 }} aria-hidden>🔒</div>
          <b style={{ fontSize: 16 }}>Tela bloqueada</b>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '4px 0 16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
          {erro && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
          <form onSubmit={desbloquear}>
            <PasswordInput autoComplete="current-password" placeholder="Sua senha" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button className="ga-btn" type="submit" disabled={busy} style={{ marginTop: 12 }}>{busy ? 'Verificando…' : 'Desbloquear'}</button>
          </form>
          <button type="button" onClick={() => void signOut()} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--tx3)', fontSize: 13, cursor: 'pointer' }}>Sair da conta</button>
        </div>
      </div>
    </div>
  )
}
