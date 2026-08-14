import { useEffect, useRef, useState, type JSX } from 'react'
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
import NovaOrg from './screens/NovaOrg'
import Perfil from './screens/Perfil'
import Professores from './screens/Professores'

type Nav = [id: string, ico: string, label: string]
const NAV_ARENA: Nav[] = [['inicio', '🏠', 'Início'], ['agenda', '📅', 'Agenda'], ['unidades', '📍', 'Unidades'], ['quadras', '🥅', 'Quadras'], ['parceiros', '🤝', 'Parceiros'], ['equipe', '👥', 'Equipe'], ['config', '⚙️', 'Configurações']]
const NAV_ESCOLA: Nav[] = [['inicio', '🏠', 'Início'], ['agenda', '📅', 'Agenda'], ['alunos', '🎓', 'Alunos'], ['turmas', '🏐', 'Turmas'], ['professores', '👤', 'Professores'], ['parceiros', '🤝', 'Parceiros'], ['equipe', '👥', 'Equipe'], ['config', '⚙️', 'Configurações']]

const TELAS: Record<string, () => JSX.Element> = {
  inicio: Dashboard, agenda: Agenda, alunos: Alunos, turmas: Turmas, professores: Professores,
  unidades: Unidades, quadras: Quadras, parceiros: Parceiros, equipe: Equipe, config: Config,
}

function SideNav({ nav, view, onNavigate, onNovaOrg }: {
  nav: Nav[]; view: string; onNavigate: (id: string) => void; onNovaOrg: () => void
}) {
  const { org, orgs, setOrg } = useAuth()
  return (
    <>
      <div className="ga-logo" style={{ padding: '0 8px', marginBottom: 16 }}><span className="mark">A</span><b>Gestor Arena</b></div>
      {orgs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, margin: '0 4px 12px' }}>
          <select value={org?.id} onChange={(e) => setOrg(e.target.value)} aria-label="Organização atual"
            style={{ flex: 1, minWidth: 0, padding: '9px 10px', borderRadius: 10, background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid rgba(255,255,255,.12)', fontSize: 13 }}>
            {orgs.map((o) => <option key={o.org.id} value={o.org.id} style={{ color: '#000' }}>{o.org.nome} · {o.org.tipo}</option>)}
          </select>
          <button type="button" onClick={onNovaOrg} title="Nova organização" aria-label="Nova organização"
            style={{ flex: 'none', width: 36, borderRadius: 10, background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', fontSize: 16 }}>+</button>
        </div>
      )}
      <nav>{nav.map(([id, ic, label]) => (
        <button key={id} className={'ga-nav' + (view === id ? ' on' : '')} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}><span aria-hidden>{ic}</span>{label}</button>
      ))}</nav>
    </>
  )
}

function UserMenu({ nome, role, onPerfil }: { nome: string; role: string | null; onPerfil: () => void }) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const foto = user?.user_metadata?.foto_url as string | undefined
  useEffect(() => {
    if (!open) return
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: '50%', flex: 'none', background: foto ? `center/cover url(${foto})` : 'linear-gradient(135deg, var(--brand), var(--navy))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
          {!foto && (nome.trim()[0]?.toUpperCase() ?? '?')}
        </span>
        <span style={{ textAlign: 'left', lineHeight: 1.2, maxWidth: 160, overflow: 'hidden' }}>
          <b style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</b>
          <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{role}</span>
        </span>
        <span aria-hidden style={{ color: 'var(--tx3)', fontSize: 11 }}>▾</span>
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 180, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: 6, zIndex: 40 }}>
          <button role="menuitem" className="ga-menuitem" onClick={() => { setOpen(false); onPerfil() }}>✏️ Editar perfil</button>
          <button role="menuitem" className="ga-menuitem" onClick={() => void signOut()}>🚪 Sair</button>
        </div>
      )}
    </div>
  )
}

function Shell() {
  const { org, role, user } = useAuth()
  const [view, setView] = useState('inicio')
  const [novaOrg, setNovaOrg] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const nav = org?.tipo === 'arena' ? NAV_ARENA : NAV_ESCOLA
  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email ?? ''

  // ao trocar de organização, volta para Início (evita renderizar tela de Arena numa Escola e header em branco)
  useEffect(() => { setView('inicio') }, [org?.id])
  const viewValida = nav.some((n) => n[0] === view) ? view : 'inicio'
  const Tela = TELAS[viewValida] ?? Dashboard

  function navegar(id: string) { setView(id); setDrawer(false) }

  return (
    <div className="ga-shell">
      <aside className="ga-side">
        <SideNav nav={nav} view={viewValida} onNavigate={navegar} onNovaOrg={() => setNovaOrg(true)} />
      </aside>

      {drawer && (
        <div className="ga-drawer-bg" onClick={() => setDrawer(false)}>
          <aside className="ga-side ga-drawer" onClick={(e) => e.stopPropagation()}>
            <SideNav nav={nav} view={viewValida} onNavigate={navegar} onNovaOrg={() => { setDrawer(false); setNovaOrg(true) }} />
          </aside>
        </div>
      )}

      <div className="ga-main">
        <header className="ga-top">
          <button type="button" className="ga-ham" onClick={() => setDrawer(true)} aria-label="Abrir menu" title="Menu">☰</button>
          <h1 style={{ fontSize: 18, fontWeight: 600, flex: 1, margin: 0 }}>{nav.find((n) => n[0] === viewValida)?.[2]}</h1>
          <UserMenu nome={nome} role={role} onPerfil={() => setPerfil(true)} />
        </header>
        <main className="ga-content"><Tela key={org?.id} /></main>
      </div>

      {novaOrg && <NovaOrg onClose={() => setNovaOrg(false)} />}
      {perfil && <Perfil onClose={() => setPerfil(false)} />}
    </div>
  )
}

function Gate() {
  const { loading, user, orgs } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--tx2)' }}>Carregando…</div>
  if (!user) return <Login />
  if (orgs.length === 0) return <Onboarding />
  return <Shell />
}

export default function App() {
  return <ToastHost><AuthProvider><Gate /></AuthProvider></ToastHost>
}
