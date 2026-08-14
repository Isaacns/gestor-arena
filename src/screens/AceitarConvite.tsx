import { useEffect, useState, type FormEvent } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { PasswordInput } from '../ui/kit'
import { Logo } from '../ui/Logo'

type Info = { valido: boolean; org_nome: string; org_tipo: string; role: string; exige_email: boolean; email: string | null }
const ROTULO: Record<string, string> = { owner: 'Proprietário', admin: 'Administrador', gerente: 'Gerente', financeiro: 'Financeiro', recepcao: 'Recepção', operacional: 'Operacional', coordenador: 'Coordenador', professor: 'Professor', visualizador: 'Visualizador' }

const inp: React.CSSProperties = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--line2)', color: 'var(--tx)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 5, marginTop: 12, textTransform: 'uppercase', letterSpacing: '.06em' }

export default function AceitarConvite({ token, onDone }: { token: string; onDone: () => void }) {
  const { user, reload, setOrg } = useAuth()
  const [info, setInfo] = useState<Info | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [modo, setModo] = useState<'criar' | 'entrar'>('criar')
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [senha, setSenha] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data } = await sb.rpc('convite_info', { p_token: token })
      if (!vivo) return
      const d = data as Info | null
      setInfo(d); setCarregando(false)
      if (d?.email) setEmail(d.email)
    })()
    return () => { vivo = false }
  }, [token])

  async function aceitar() {
    setBusy(true); setErro(null)
    const { data, error } = await sb.rpc('aceitar_convite', { p_token: token })
    setBusy(false)
    if (error) { setErro(error.message); return }
    const org = data as string
    if (org) localStorage.setItem('ga_org', org)
    await reload(); if (org) setOrg(org)
    onDone()
  }

  async function autenticar(e: FormEvent) {
    e.preventDefault(); setErro(null); setMsg(null); setBusy(true)
    if (modo === 'entrar') {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha })
      setBusy(false)
      if (error) setErro('E-mail ou senha incorretos.')
    } else {
      if (senha.length < 8) { setBusy(false); setErro('A senha precisa de ao menos 8 caracteres.'); return }
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome } } })
      setBusy(false)
      if (error) { setErro(error.message); return }
      if (!data.session) setMsg('Conta criada! Confirme pelo e-mail e depois reabra este link para entrar.')
    }
  }

  const box = (c: string): React.CSSProperties => ({ border: `1px solid ${c}`, color: c, background: 'transparent', borderRadius: 10, padding: '9px 12px', fontSize: 13, marginTop: 12 })

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, position: 'relative' }}>
      <div className="ga-aura" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 20, padding: '32px 30px', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ marginBottom: 18 }}><Logo size={34} /></div>

        {carregando ? <p style={{ color: 'var(--tx2)', fontSize: 14 }}>Verificando convite…</p>
          : !info?.valido ? (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Convite inválido</h1>
              <p style={{ color: 'var(--tx2)', fontSize: 14 }}>Este convite não existe, já foi usado ou expirou. Peça um novo para quem te convidou.</p>
              <a href="/" className="ga-btn" style={{ textDecoration: 'none', marginTop: 8 }}>Ir para o login</a>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Você foi convidado 🎉</h1>
              <p style={{ color: 'var(--tx2)', fontSize: 14, margin: '6px 0 4px' }}>
                Para <b style={{ color: 'var(--tx)' }}>{info.org_nome}</b> ({info.org_tipo === 'arena' ? 'Arena' : 'Escolinha'}) como <b style={{ color: 'var(--tx)' }}>{ROTULO[info.role] ?? info.role}</b>.
              </p>
              {erro && <div role="alert" style={box('var(--danger)')}>{erro}</div>}
              {msg && <div role="status" style={box('var(--ok)')}>{msg}</div>}

              {user ? (
                <button className="ga-btn" style={{ marginTop: 16 }} disabled={busy} onClick={() => void aceitar()}>{busy ? 'Entrando…' : 'Aceitar e entrar'}</button>
              ) : (
                <form onSubmit={autenticar} style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 13, color: 'var(--tx2)' }}>{modo === 'criar' ? 'Crie sua conta para entrar:' : 'Entre com sua conta:'}</p>
                  {modo === 'criar' && <><span style={lbl}>Seu nome</span><input style={inp} required value={nome} onChange={(e) => setNome(e.target.value)} /></>}
                  <span style={lbl}>E-mail</span>
                  <input style={{ ...inp, ...(info.exige_email ? { opacity: .7 } : {}) }} type="email" required value={email} disabled={info.exige_email} onChange={(e) => setEmail(e.target.value)} />
                  <span style={lbl}>Senha{modo === 'criar' ? ' (mín. 8)' : ''}</span>
                  <PasswordInput required value={senha} onChange={(e) => setSenha(e.target.value)} />
                  <button className="ga-btn" type="submit" disabled={busy} style={{ marginTop: 14 }}>{busy ? '…' : modo === 'criar' ? 'Criar conta e continuar' : 'Entrar e continuar'}</button>
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--tx2)', textAlign: 'center' }}>
                    {modo === 'criar' ? <>Já tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setErro(null); setModo('entrar') }}>Entrar</a></>
                      : <>Não tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setErro(null); setModo('criar') }}>Criar</a></>}
                  </p>
                </form>
              )}
            </>
          )}
      </div>
    </div>
  )
}
