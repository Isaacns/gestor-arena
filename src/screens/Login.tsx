import { useState, type FormEvent } from 'react'
import { sb } from '../lib/supabase'
import { PasswordInput } from '../ui/kit'
import { Logo } from '../ui/Logo'

export default function Login() {
  const [modo, setModo] = useState<'entrar' | 'criar' | 'recuperar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function irPara(m: 'entrar' | 'criar' | 'recuperar') { setErro(null); setMsg(null); setModo(m) }

  async function entrar(e: FormEvent) {
    e.preventDefault(); setErro(null); setBusy(true)
    const { error } = await sb.auth.signInWithPassword({ email, password: senha })
    setBusy(false)
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
  }
  async function criar(e: FormEvent) {
    e.preventDefault(); setErro(null); setMsg(null)
    if (senha.length < 8) { setErro('A senha precisa de ao menos 8 caracteres.'); return }
    setBusy(true)
    const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome } } })
    setBusy(false)
    if (error) { setErro(error.message); return }
    if (!data.session) { setMsg('Conta criada! Confirme pelo e-mail e depois entre.'); setModo('entrar') }
  }
  async function recuperar(e: FormEvent) {
    e.preventDefault(); setErro(null); setMsg(null)
    if (!email) { setErro('Informe seu e-mail.'); return }
    setBusy(true)
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setBusy(false)
    if (error) { setErro(error.message); return }
    setMsg('Se este e-mail tiver conta, enviamos um link para redefinir a senha. Depois de entrar, troque a senha em "Meu perfil".')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, position: 'relative' }}>
      <div className="ga-aura" aria-hidden />
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 20, padding: '36px 32px', boxShadow: 'var(--card-shadow)', position: 'relative', zIndex: 1 }}>
        <div className="ga-float" style={{ marginBottom: 22, display: 'inline-flex' }}><Logo size={38} /></div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Bem-vindo</h1>
        <p style={{ color: 'var(--tx2)', fontSize: 13, margin: '4px 0 24px' }}>
          A gestão da sua arena e da sua escolinha, no mesmo lugar.
        </p>

        {erro && <div role="alert" style={box('var(--danger)')}>{erro}</div>}
        {msg && <div role="status" style={box('var(--ok)')}>{msg}</div>}

        {modo === 'entrar' && (
          <form onSubmit={entrar}>
            <Field label="E-mail"><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inp} /></Field>
            <Field label="Senha"><PasswordInput autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></Field>
            <button className="ga-btn" disabled={busy} type="submit">{busy ? 'Entrando…' : 'Entrar'}</button>
            <p style={rodape}><a href="#" onClick={(e) => { e.preventDefault(); irPara('recuperar') }}>Esqueci minha senha</a></p>
            <p style={rodape}>Primeira vez? <a href="#" onClick={(e) => { e.preventDefault(); irPara('criar') }}>Criar conta</a></p>
          </form>
        )}
        {modo === 'criar' && (
          <form onSubmit={criar}>
            <Field label="Seu nome"><input required value={nome} onChange={(e) => setNome(e.target.value)} style={inp} /></Field>
            <Field label="E-mail"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inp} /></Field>
            <Field label="Senha (mín. 8)"><PasswordInput required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} /></Field>
            <button className="ga-btn" disabled={busy} type="submit">{busy ? 'Criando…' : 'Criar conta'}</button>
            <p style={rodape}>Já tem conta? <a href="#" onClick={(e) => { e.preventDefault(); irPara('entrar') }}>Entrar</a></p>
          </form>
        )}
        {modo === 'recuperar' && (
          <form onSubmit={recuperar}>
            <Field label="E-mail"><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inp} /></Field>
            <button className="ga-btn" disabled={busy} type="submit">{busy ? 'Enviando…' : 'Enviar link de redefinição'}</button>
            <p style={rodape}>Lembrou? <a href="#" onClick={(e) => { e.preventDefault(); irPara('entrar') }}>Voltar para entrar</a></p>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      {children}
    </label>
  )
}
const inp: React.CSSProperties = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--line2)', color: 'var(--tx)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }
const rodape: React.CSSProperties = { marginTop: 14, fontSize: 13, color: 'var(--tx2)', textAlign: 'center' }
const box = (c: string): React.CSSProperties => ({ border: `1px solid ${c}`, color: c, background: 'transparent', borderRadius: 10, padding: '9px 12px', fontSize: 13, marginBottom: 14 })
