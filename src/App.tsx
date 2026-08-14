import { createContext, useContext, useEffect, useRef, useState, type JSX } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ToastHost } from './ui/kit'
import { Logo, LogoMark } from './ui/Logo'
import { Icon } from './ui/icons'
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
import Locais from './screens/Locais'
import EmBreve from './screens/EmBreve'

/* ---------- navegação entre telas (para CTAs e sub-telas) ---------- */
const NavCtx = createContext<(id: string) => void>(() => {})
export function useNav() { return useContext(NavCtx) }

type Nav = [id: string, ico: string, label: string]
const NAV_ARENA: Nav[] = [
  ['inicio', 'home', 'Visão Geral'], ['agenda', 'calendar', 'Agenda'], ['unidades', 'pin', 'Unidades'], ['quadras', 'grid', 'Quadras'],
  ['parceiros', 'link', 'Parceiros'], ['clientes', 'users', 'Clientes'], ['financeiro', 'dollar', 'Financeiro'],
  ['estoque', 'box', 'Estoque'], ['manutencao', 'wrench', 'Manutenção'], ['relatorios', 'chart', 'Relatórios'],
  ['equipe', 'users', 'Equipe'], ['config', 'gear', 'Configurações'],
]
const NAV_ESCOLA: Nav[] = [
  ['inicio', 'home', 'Visão Geral'], ['agenda', 'calendar', 'Agenda'], ['alunos', 'cap', 'Alunos'], ['turmas', 'roster', 'Turmas'],
  ['professores', 'user', 'Professores'], ['financeiro', 'dollar', 'Financeiro'], ['locais', 'pin', 'Locais'],
  ['reposicoes', 'repeat', 'Reposições'], ['parceiros', 'link', 'Parceiros'], ['equipe', 'users', 'Equipe'], ['config', 'gear', 'Configurações'],
]

// módulos das próximas ondas — tela on-brand que explica o módulo (menu já igual ao mockup)
const Clientes = () => <EmBreve ico="🧑" titulo="Clientes" descricao="Base de clientes da arena: quem aluga suas quadras (avulso ou recorrente), histórico e contato." itens={['Cadastro de clientes e contatos', 'Histórico de reservas e locações por cliente', 'Ligação com contas a receber (Financeiro)']} />
const Financeiro = () => <EmBreve ico="💰" titulo="Financeiro" descricao="Mensalidades da escola e contas a receber da arena, com cobrança, baixa, estorno e inadimplência — tudo em tabelas reais e seguro por organização." itens={['Mensalidades recorrentes por aluno/turma', 'Contas a receber de locações e contratos', 'Cobrança e baixa; inadimplência (vencido) derivada', 'Integração Asaas (boleto/PIX) — pronta para ligar']} />
const Estoque = () => <EmBreve ico="📦" titulo="Estoque" descricao="Controle de itens da arena/escola: materiais esportivos, bar/lanchonete, uniformes." itens={['Cadastro de itens e categorias', 'Entradas e saídas com saldo', 'Alertas de estoque baixo']} />
const Manutencao = () => <EmBreve ico="🔧" titulo="Manutenção" descricao="Ordens de manutenção das quadras e do espaço, para não perder reserva por quadra parada." itens={['Abrir chamado por quadra/unidade', 'Status: aberto → em andamento → concluído', 'Bloqueio da agenda durante a manutenção']} />
const Relatorios = () => <EmBreve ico="📊" titulo="Relatórios" descricao="Indicadores de ocupação, receita e desempenho para decisão." itens={['Ocupação por quadra/horário/período', 'Receita por origem e prevista × realizada', 'Exportação (CSV/PDF)']} />
const Reposicoes = () => <EmBreve ico="🔁" titulo="Reposições" descricao="Gestão de reposição de aulas: aluno que faltou remarca em outra turma/data." itens={['Registrar falta que gera direito a reposição', 'Agendar a reposição em turma compatível', 'Controle de reposições pendentes e realizadas']} />

const TELAS: Record<string, () => JSX.Element> = {
  inicio: Dashboard, agenda: Agenda, alunos: Alunos, turmas: Turmas, professores: Professores, locais: Locais,
  unidades: Unidades, quadras: Quadras, parceiros: Parceiros, equipe: Equipe, config: Config,
  clientes: Clientes, financeiro: Financeiro, estoque: Estoque, manutencao: Manutencao, relatorios: Relatorios, reposicoes: Reposicoes,
}

function SideNav({ nav, view, onNavigate }: { nav: Nav[]; view: string; onNavigate: (id: string) => void }) {
  return (
    <>
      <div style={{ padding: '0 8px', marginBottom: 18 }}><Logo /></div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {nav.map(([id, ic, label]) => (
          <button key={id} className={'ga-nav' + (view === id ? ' on' : '')} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}><span className="ga-nav-ic" aria-hidden><Icon name={ic} size={19} /></span>{label}</button>
        ))}
      </nav>
    </>
  )
}

function OrgSwitcher({ onAfter }: { onAfter?: () => void }) {
  const { org, orgs, setOrg } = useAuth()
  const [nova, setNova] = useState(false)
  if (orgs.length === 0) return null
  return (
    <>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span aria-hidden style={{ fontSize: 15 }}>{org?.tipo === 'arena' ? '🏟️' : '🎓'}</span>
        <select value={org?.id} onChange={(e) => { setOrg(e.target.value); onAfter?.() }} aria-label="Organização atual"
          style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--tx)', cursor: 'pointer', maxWidth: 180 }}>
          {orgs.map((o) => <option key={o.org.id} value={o.org.id}>{o.org.nome}</option>)}
        </select>
        <button type="button" onClick={() => setNova(true)} title="Nova organização" aria-label="Nova organização"
          style={{ width: 24, height: 24, borderRadius: 7, border: '1px solid var(--line2)', background: 'var(--card2)', color: 'var(--tx2)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
      </div>
      {nova && <NovaOrg onClose={() => setNova(false)} />}
    </>
  )
}

function Notificacoes() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fora); return () => document.removeEventListener('mousedown', fora)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="ga-iconbtn" onClick={() => setOpen((o) => !o)} aria-label="Notificações" title="Notificações"><Icon name="bell" size={18} /></button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 260, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: 14, zIndex: 40 }}>
          <b style={{ fontSize: 13 }}>Notificações</b>
          <p style={{ fontSize: 12, color: 'var(--tx2)', margin: '8px 0 0' }}>Sem novidades por aqui. A central de avisos (convites, pagamentos, manutenção) chega em breve.</p>
        </div>
      )}
    </div>
  )
}

function UserMenu({ onPerfil }: { onPerfil: () => void }) {
  const { user, role, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email ?? ''
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
        style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none', background: foto ? `center/cover url(${foto})` : 'linear-gradient(135deg, var(--brand), var(--navy))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
          {!foto && (nome.trim()[0]?.toUpperCase() ?? '?')}
        </span>
        <span className="ga-userlabel" style={{ textAlign: 'left', lineHeight: 1.2, maxWidth: 150, overflow: 'hidden' }}>
          <b style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</b>
          <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{role}</span>
        </span>
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 190, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: 6, zIndex: 40 }}>
          <button role="menuitem" className="ga-menuitem" onClick={() => { setOpen(false); onPerfil() }}>✏️ Editar perfil</button>
          <button role="menuitem" className="ga-menuitem" onClick={() => void signOut()}>🚪 Sair</button>
        </div>
      )}
    </div>
  )
}

function Shell() {
  const { org } = useAuth()
  const [view, setView] = useState('inicio')
  const [perfil, setPerfil] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [busca, setBusca] = useState('')
  const nav = org?.tipo === 'arena' ? NAV_ARENA : NAV_ESCOLA

  const [orgAnterior, setOrgAnterior] = useState(org?.id)
  if (org?.id !== orgAnterior) { setOrgAnterior(org?.id); setView('inicio') }
  const viewValida = nav.some((n) => n[0] === view) ? view : 'inicio'
  const Tela = TELAS[viewValida] ?? Dashboard

  function navegar(id: string) { if (TELAS[id]) { setView(id); setDrawer(false) } }
  function buscar() {
    const t = busca.trim().toLowerCase(); if (!t) return
    const alvo = nav.find((n) => n[2].toLowerCase().includes(t))
    if (alvo) { setView(alvo[0]); setBusca('') }
  }

  return (
    <NavCtx.Provider value={navegar}>
      <div className="ga-shell">
        <div className="ga-aura" aria-hidden />
        <aside className="ga-side"><SideNav nav={nav} view={viewValida} onNavigate={navegar} /></aside>
        {drawer && (
          <div className="ga-drawer-bg" onClick={() => setDrawer(false)}>
            <aside className="ga-side ga-drawer" onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '4px 8px 10px' }}><OrgSwitcher onAfter={() => setDrawer(false)} /></div>
              <SideNav nav={nav} view={viewValida} onNavigate={navegar} />
            </aside>
          </div>
        )}
        <div className="ga-main">
          <header className="ga-top">
            <button type="button" className="ga-ham" onClick={() => setDrawer(true)} aria-label="Abrir menu" title="Menu">☰</button>
            <div className="ga-topbar-org ga-hide-mob"><OrgSwitcher /></div>
            <label className="ga-search"><span aria-hidden style={{ display: 'flex', color: 'var(--tx3)' }}><Icon name="search" size={16} /></span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') buscar() }} placeholder="Buscar…" aria-label="Buscar" />
            </label>
            <div style={{ flex: 1 }} />
            <Notificacoes />
            <UserMenu onPerfil={() => setPerfil(true)} />
          </header>
          <main className="ga-content"><Tela key={org?.id} /></main>
        </div>
        {perfil && <Perfil onClose={() => setPerfil(false)} />}
      </div>
    </NavCtx.Provider>
  )
}

function Gate() {
  const { loading, user, orgs } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--tx2)' }}><LogoMark size={40} /></div>
  if (!user) return <Login />
  if (orgs.length === 0) return <Onboarding />
  return <Shell />
}

export default function App() {
  return <ToastHost><AuthProvider><Gate /></AuthProvider></ToastHost>
}
