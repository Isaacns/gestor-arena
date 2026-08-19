import { createContext, useContext, useEffect, useRef, useState, type JSX } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { sb } from './lib/supabase'
import { FocusCtx, type Foco } from './lib/focus'
import Novidades from './ui/Novidades'
import { ToastHost } from './ui/kit'
import { Logo, LogoMark } from './ui/Logo'
import { Icon } from './ui/icons'
import { AuraBackground } from './ui/AuraBackground'
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
import Bloquear from './screens/Bloquear'
import AceitarConvite from './screens/AceitarConvite'
import PortalAluno from './screens/PortalAluno'
import Financeiro from './screens/Financeiro'
import Clientes from './screens/Clientes'
import Relatorios from './screens/Relatorios'
import Estoque from './screens/Estoque'
import Manutencao from './screens/Manutencao'
import Reposicoes from './screens/Reposicoes'

/* ---------- navegação entre telas (para CTAs e sub-telas) ---------- */
const NavCtx = createContext<(id: string, focusId?: string) => void>(() => {})
export function useNav() { return useContext(NavCtx) }

type Nav = [id: string, ico: string, label: string]
const NAV_ARENA: Nav[] = [
  ['inicio', '🏠', 'Visão Geral'], ['agenda', '📅', 'Agenda'], ['unidades', '📍', 'Unidades'], ['quadras', '🥅', 'Quadras'],
  ['parceiros', '🤝', 'Parceiros'], ['clientes', '🧑', 'Clientes'], ['financeiro', '💰', 'Financeiro'],
  ['estoque', '📦', 'Estoque'], ['manutencao', '🔧', 'Manutenção'], ['relatorios', '📊', 'Relatórios'],
  ['equipe', '👥', 'Equipe'], ['config', '⚙️', 'Configurações'],
]
const NAV_ESCOLA: Nav[] = [
  ['inicio', '🏠', 'Visão Geral'], ['agenda', '📅', 'Agenda'], ['alunos', '🎓', 'Alunos'], ['turmas', '🏐', 'Turmas'],
  ['professores', '👤', 'Professores'], ['financeiro', '💰', 'Financeiro'], ['locais', '📍', 'Locais'],
  ['reposicoes', '🔁', 'Reposições'], ['parceiros', '🤝', 'Parceiros'], ['equipe', '👥', 'Equipe'], ['config', '⚙️', 'Configurações'],
]

// módulos das próximas ondas — tela on-brand que explica o módulo (menu já igual ao mockup)

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
          <button key={id} className={'ga-nav' + (view === id ? ' on' : '')} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}><span className="ga-nav-ic" aria-hidden style={{ fontSize: 16 }}>{ic}</span>{label}</button>
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

type Aviso = { ico: string; titulo: string; texto: string; view: string }
function Notificacoes() {
  const { org } = useAuth()
  const nav = useNav()
  const [open, setOpen] = useState(false)
  const [itens, setItens] = useState<Aviso[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const ehArena = org?.tipo === 'arena'

  useEffect(() => {
    if (!org) { setItens([]); return }
    let vivo = true
    const hj = new Date(); const hoje = `${hj.getFullYear()}-${String(hj.getMonth() + 1).padStart(2, '0')}-${String(hj.getDate()).padStart(2, '0')}`
    ;(async () => {
      const out: Aviso[] = []
      const [v, cob, inv, ms] = await Promise.all([
        sb.rpc('meus_vinculos', { p_org: org.id }),
        sb.from('cobrancas').select('vencimento').eq('org_id', org.id).eq('status', 'pendente'),
        sb.from('inventory_items').select('quantidade,minimo,ativo').eq('org_id', org.id),
        ehArena ? sb.from('maintenance_orders').select('id').eq('org_id', org.id).in('status', ['aberta', 'em_andamento'])
          : sb.from('makeups').select('id').eq('org_id', org.id).eq('status', 'pendente'),
      ])
      if (!vivo) return
      ;((v.data as { status: string; eu_criei: boolean; parceiro_nome: string }[]) ?? [])
        .filter((x) => x.status === 'pendente' && !x.eu_criei)
        .forEach((p) => out.push({ ico: '🤝', titulo: 'Convite de parceria', texto: `${p.parceiro_nome} aguarda sua resposta`, view: 'parceiros' }))
      const venc = ((cob.data as { vencimento: string }[]) ?? []).filter((c) => c.vencimento < hoje).length
      if (venc > 0) out.push({ ico: '💰', titulo: `${venc} cobrança(s) vencida(s)`, texto: 'Inadimplência para cobrar', view: 'financeiro' })
      const low = ((inv.data as { quantidade: number; minimo: number; ativo: boolean }[]) ?? []).filter((i) => i.ativo && Number(i.quantidade) <= Number(i.minimo)).length
      if (low > 0) out.push({ ico: '📦', titulo: `${low} item(ns) com estoque baixo`, texto: 'Repor no Estoque', view: 'estoque' })
      const n = (ms.data as unknown[])?.length ?? 0
      if (n > 0) out.push(ehArena
        ? { ico: '🔧', titulo: `${n} chamado(s) de manutenção`, texto: 'Em aberto', view: 'manutencao' }
        : { ico: '🔁', titulo: `${n} reposição(ões) pendente(s)`, texto: 'A agendar', view: 'reposicoes' })
      if (vivo) setItens(out)
    })()
    return () => { vivo = false }
  }, [org, ehArena])

  useEffect(() => {
    if (!open) return
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fora); return () => document.removeEventListener('mousedown', fora)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="ga-iconbtn" onClick={() => setOpen((o) => !o)} aria-label={`Notificações${itens.length ? ` (${itens.length})` : ''}`} title="Notificações">
        <Icon name="bell" size={18} />{itens.length > 0 && <span className="dot" />}
      </button>
      {open && (
        <div className="ga-glass" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 288, maxWidth: '90vw', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: 8, zIndex: 40 }}>
          <b style={{ fontSize: 13, display: 'block', padding: '4px 8px' }}>Notificações</b>
          {itens.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tx2)', padding: '4px 8px 8px' }}>Tudo em dia por aqui. 🎉</p>
            : itens.map((a, i) => (
              <button key={i} className="ga-menuitem" style={{ alignItems: 'flex-start' }} onClick={() => { setOpen(false); nav(a.view) }}>
                <span aria-hidden style={{ marginTop: 1 }}>{a.ico}</span>
                <span style={{ textAlign: 'left' }}><b style={{ fontSize: 13, display: 'block' }}>{a.titulo}</b><span style={{ fontSize: 12, color: 'var(--tx2)' }}>{a.texto}</span></span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function UserMenu({ onPerfil, onLock }: { onPerfil: () => void; onLock: () => void }) {
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
        <div role="menu" className="ga-glass" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 190, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: 6, zIndex: 40 }}>
          <button role="menuitem" className="ga-menuitem" onClick={() => { setOpen(false); onPerfil() }}>✏️ Editar perfil</button>
          <button role="menuitem" className="ga-menuitem" onClick={() => { setOpen(false); onPerfil() }}>🔑 Alterar senha</button>
          <button role="menuitem" className="ga-menuitem" onClick={() => { setOpen(false); onLock() }}>🔒 Bloquear</button>
          <div style={{ height: 1, background: 'var(--line)', margin: '4px 6px' }} />
          <button role="menuitem" className="ga-menuitem" onClick={() => void signOut()}>🚪 Sair</button>
        </div>
      )}
    </div>
  )
}

type Achado = { tipo: string; nome: string; view: string; id: string }
function GlobalSearch() {
  const { org } = useAuth()
  const nav = useNav()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Achado[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ehArena = org?.tipo === 'arena'

  useEffect(() => {
    function key(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) { e.preventDefault(); inputRef.current?.focus() }
    }
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    const t = q.trim()
    if (!org || t.length < 2) { setRes([]); setOpen(false); return }
    let vivo = true
    setBusy(true)
    const h = setTimeout(async () => {
      const like = `%${t}%`
      const defs = ehArena
        ? [['customers', 'Cliente', 'clientes'], ['courts', 'Quadra', 'quadras']] as const
        : [['students', 'Aluno', 'alunos'], ['classes', 'Turma', 'turmas'], ['professionals', 'Professor', 'professores']] as const
      const rows = await Promise.all(defs.map(([tab]) => sb.from(tab).select('id,nome').eq('org_id', org.id).ilike('nome', like).limit(6)))
      if (!vivo) return
      const out: Achado[] = []
      rows.forEach((r, i) => ((r.data as { id: string; nome: string }[]) ?? []).forEach((x) => out.push({ tipo: defs[i][1], nome: x.nome, view: defs[i][2], id: x.id })))
      setRes(out); setSel(0); setOpen(true); setBusy(false)
    }, 250)
    return () => { vivo = false; clearTimeout(h) }
  }, [q, org, ehArena])

  useEffect(() => {
    if (!open) return
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fora); return () => document.removeEventListener('mousedown', fora)
  }, [open])

  function abrir(a: Achado) { nav(a.view, a.id); setQ(''); setRes([]); setOpen(false) }

  return (
    <div ref={ref} className="ga-search-wrap ga-hide-mob" style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
      <label className="ga-search" style={{ maxWidth: 'none' }}>
        <span aria-hidden style={{ display: 'flex', color: 'var(--tx3)' }}><Icon name="search" size={16} /></span>
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => { if (res.length) setOpen(true) }} placeholder="Buscar…  ( / )" aria-label="Buscar"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, res.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
            else if (e.key === 'Enter') { if (res[sel]) abrir(res[sel]) }
            else if (e.key === 'Escape') { setQ(''); setOpen(false); inputRef.current?.blur() }
          }} />
      </label>
      {open && q.trim().length >= 2 && (
        <div className="ga-glass" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: 6, zIndex: 45, maxHeight: 360, overflowY: 'auto' }}>
          {busy && res.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tx2)', padding: '8px 10px' }}>Buscando…</p>
            : res.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tx2)', padding: '8px 10px' }}>Nada encontrado.</p>
              : res.map((a, i) => (
                <button key={a.view + a.id} className="ga-menuitem" onMouseEnter={() => setSel(i)} onClick={() => abrir(a)} style={{ background: i === sel ? 'var(--bg2)' : undefined }}>
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</span>
                  <span style={{ fontSize: 11, color: 'var(--tx3)', flex: 'none' }}>{a.tipo}</span>
                </button>
              ))}
        </div>
      )}
    </div>
  )
}

function Shell() {
  const { org } = useAuth()
  const [view, setView] = useState('inicio')
  const [perfil, setPerfil] = useState(false)
  const [locked, setLocked] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [foco, setFoco] = useState<Foco>(null)
  const nav = org?.tipo === 'arena' ? NAV_ARENA : NAV_ESCOLA

  const [orgAnterior, setOrgAnterior] = useState(org?.id)
  if (org?.id !== orgAnterior) { setOrgAnterior(org?.id); setView('inicio') }
  const viewValida = nav.some((n) => n[0] === view) ? view : 'inicio'
  const Tela = TELAS[viewValida] ?? Dashboard

  function navegar(id: string, focusId?: string) { if (TELAS[id]) { setView(id); setDrawer(false); setFoco(focusId ? { view: id, id: focusId } : null) } }

  return (
    <NavCtx.Provider value={navegar}>
     <FocusCtx.Provider value={{ foco, limpar: () => setFoco(null) }}>
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
            <GlobalSearch />
            <div style={{ flex: 1 }} />
            <Novidades />
            <Notificacoes />
            <UserMenu onPerfil={() => setPerfil(true)} onLock={() => setLocked(true)} />
          </header>
          <main className="ga-content"><Tela key={org?.id} /></main>
        </div>
        {perfil && <Perfil onClose={() => setPerfil(false)} />}
        {locked && <Bloquear onUnlock={() => setLocked(false)} />}
      </div>
     </FocusCtx.Provider>
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
  const params = new URLSearchParams(window.location.search)
  const portal = params.get('portal')
  if (portal) return <ToastHost><AuraBackground /><PortalAluno token={portal} /></ToastHost>
  const convite = params.get('convite')
  return (
    <ToastHost>
      <AuraBackground />
      <AuthProvider>
        {convite
          ? <AceitarConvite token={convite} onDone={() => { window.history.replaceState({}, '', window.location.pathname); window.location.reload() }} />
          : <Gate />}
      </AuthProvider>
    </ToastHost>
  )
}
