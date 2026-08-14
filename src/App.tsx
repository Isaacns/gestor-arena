import { useState, type JSX } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ToastHost } from './ui/kit'
import Login from './screens/Login'
import Onboarding from './screens/Onboarding'
import Dashboard from './screens/Dashboard'
import Agenda from './screens/Agenda'
import Alunos from './screens/Alunos'
import Turmas from './screens/Turmas'
import Unidades from './screens/Unidades'
import Quadras from './screens/Quadras'
import Parceiros from './screens/Parceiros'
import Equipe from './screens/Equipe'
import Config from './screens/Config'

type Nav = [id: string, ico: string, label: string]
const NAV_ARENA: Nav[] = [['inicio', '🏠', 'Início'], ['agenda', '📅', 'Agenda'], ['unidades', '📍', 'Unidades'], ['quadras', '🥅', 'Quadras'], ['parceiros', '🤝', 'Parceiros'], ['equipe', '👥', 'Equipe'], ['config', '⚙️', 'Configurações']]
const NAV_ESCOLA: Nav[] = [['inicio', '🏠', 'Início'], ['agenda', '📅', 'Agenda'], ['alunos', '🎓', 'Alunos'], ['turmas', '🏐', 'Turmas'], ['parceiros', '🤝', 'Parceiros'], ['equipe', '👥', 'Equipe'], ['config', '⚙️', 'Configurações']]

const TELAS: Record<string, () => JSX.Element> = {
  inicio: Dashboard, agenda: Agenda, alunos: Alunos, turmas: Turmas,
  unidades: Unidades, quadras: Quadras, parceiros: Parceiros, equipe: Equipe, config: Config,
}

function Shell() {
  const { org, orgs, role, user, setOrg, signOut } = useAuth()
  const [view, setView] = useState('inicio')
  const nav = org?.tipo === 'arena' ? NAV_ARENA : NAV_ESCOLA
  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email ?? ''
  const Tela = TELAS[view] ?? Dashboard

  return (
    <div className="ga-shell">
      <aside className="ga-side">
        <div className="ga-logo" style={{ padding: '0 8px', marginBottom: 16 }}><span className="mark">A</span><b>Gestor Arena</b></div>
        {orgs.length > 0 && (
          <select value={org?.id} onChange={(e) => setOrg(e.target.value)}
            style={{ margin: '0 4px 12px', padding: '9px 10px', borderRadius: 10, background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid rgba(255,255,255,.12)', fontSize: 13 }}>
            {orgs.map((o) => <option key={o.org.id} value={o.org.id} style={{ color: '#000' }}>{o.org.nome} · {o.org.tipo}</option>)}
          </select>
        )}
        <nav>{nav.map(([id, ic, label]) => (
          <button key={id} className={'ga-nav' + (view === id ? ' on' : '')} onClick={() => setView(id)}><span aria-hidden>{ic}</span>{label}</button>
        ))}</nav>
        <div style={{ flex: 1 }} />
        <button className="ga-nav" onClick={() => void signOut()}><span aria-hidden>🚪</span>Sair</button>
      </aside>
      <div className="ga-main">
        <header className="ga-top">
          <h2 style={{ fontSize: 18, fontWeight: 600, flex: 1, margin: 0 }}>{nav.find((n) => n[0] === view)?.[2]}</h2>
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <b style={{ fontSize: 13, display: 'block' }}>{nome}</b>
            <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{role}</span>
          </div>
        </header>
        <main className="ga-content"><Tela /></main>
      </div>
    </div>
  )
}

function Gate() {
  const { loading, user, orgs } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--tx3)' }}>Carregando…</div>
  if (!user) return <Login />
  if (orgs.length === 0) return <Onboarding />
  return <Shell />
}

export default function App() {
  return <ToastHost><AuthProvider><Gate /></AuthProvider></ToastHost>
}
