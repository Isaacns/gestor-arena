import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errMsg, Field, inp, useToast } from '../ui/kit'

type Perfil = 'arena' | 'escola' | 'ambos'

export default function Onboarding() {
  const { reload } = useAuth()
  const toast = useToast()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [nomeArena, setNomeArena] = useState('')
  const [nomeEscola, setNomeEscola] = useState('')
  const [busy, setBusy] = useState(false)

  async function concluir() {
    const chamadas: [tipo: 'arena' | 'escola', nome: string][] = []
    if (perfil === 'arena' || perfil === 'ambos') { if (!nomeArena.trim()) return toast('Informe o nome da Arena.', true); chamadas.push(['arena', nomeArena.trim()]) }
    if (perfil === 'escola' || perfil === 'ambos') { if (!nomeEscola.trim()) return toast('Informe o nome da escolinha.', true); chamadas.push(['escola', nomeEscola.trim()]) }
    setBusy(true)
    for (const [tipo, nome] of chamadas) {
      const { error } = await sb.rpc('criar_organizacao', { p_tipo: tipo, p_nome: nome })
      if (error) { toast(errMsg(error), true); setBusy(false); return }
    }
    toast('Espaço criado. Bem-vindo!')
    await reload()
  }

  const opt = (v: Perfil, t: string, d: string) => (
    <button type="button" onClick={() => setPerfil(v)} style={{
      textAlign: 'left', background: 'var(--bg2)', borderRadius: 14, padding: 16, cursor: 'pointer',
      border: '1px solid ' + (perfil === v ? 'var(--brand)' : 'var(--line2)'),
    }}>
      <b style={{ display: 'block', marginBottom: 3 }}>{t}</b>
      <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{d}</span>
    </button>
  )

  return (
    <div style={{ maxWidth: 520, margin: '6vh auto', padding: 20 }}>
      <div className="ga-logo" style={{ marginBottom: 18 }}><span className="mark">A</span><b style={{ fontSize: 15 }}>Gestor Arena</b></div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Como você usa o Gestor Arena?</h2>
      <p style={{ color: 'var(--tx2)', fontSize: 14, marginTop: 0 }}>Isso define seu espaço de trabalho. Você pode ter os dois depois.</p>
      <div style={{ display: 'grid', gap: 12, margin: '18px 0' }}>
        {opt('arena', '🏟️ Sou de uma Arena', 'Quadras, agenda, parceiros, contratos e financeiro do espaço.')}
        {opt('escola', '🎓 Tenho uma escolinha / projeto', 'Alunos, turmas, professores, presença e mensalidades.')}
        {opt('ambos', '🏟️🎓 Tenho os dois', 'Cria os dois espaços, você como proprietário de ambos.')}
      </div>
      {perfil && (
        <div>
          {(perfil === 'arena' || perfil === 'ambos') && <Field label="Nome da Arena"><input style={inp} placeholder="Ex.: Arena Beach Sports" value={nomeArena} onChange={(e) => setNomeArena(e.target.value)} /></Field>}
          {(perfil === 'escola' || perfil === 'ambos') && <Field label="Nome da escolinha / projeto"><input style={inp} placeholder="Ex.: Escolinha João Futvôlei" value={nomeEscola} onChange={(e) => setNomeEscola(e.target.value)} /></Field>}
          <button className="ga-btn" disabled={busy} onClick={() => void concluir()}>{busy ? 'Criando…' : 'Começar'}</button>
        </div>
      )}
    </div>
  )
}
