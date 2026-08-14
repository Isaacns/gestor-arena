import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { sb, type Organization } from '../lib/supabase'

interface OrgMembership { org: Organization; role: string }

interface AuthState {
  loading: boolean
  user: User | null
  orgs: OrgMembership[]
  org: Organization | null
  role: string | null
  setOrg: (id: string) => void
  reload: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fora do AuthProvider')
  return v
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [orgs, setOrgs] = useState<OrgMembership[]>([])
  const [org, setOrgState] = useState<Organization | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const uidAtual = useRef<string | null>(null)

  async function carregarContexto(u: User) {
    const { data, error } = await sb
      .from('memberships')
      .select('role, ativo, organizations(*)')
      .eq('user_id', u.id)
      .eq('ativo', true)
    if (error) { console.error(error); setLoading(false); return }
    const lista: OrgMembership[] = (data ?? [])
      .filter((m) => m.organizations && (m.organizations as unknown as Organization).status !== 'encerrada')
      .map((m) => ({ org: m.organizations as unknown as Organization, role: m.role as string }))
    setOrgs(lista)
    const salvo = localStorage.getItem('ga_org')
    const escolhida = lista.find((o) => o.org.id === salvo) ?? lista[0] ?? null
    setOrgState(escolhida?.org ?? null)
    setRole(escolhida?.role ?? null)
    setLoading(false)
  }

  function trocarSessao(session: Session | null) {
    const u = session?.user ?? null
    setUser(u)
    if (!u) { uidAtual.current = null; setOrgs([]); setOrgState(null); setRole(null); setLoading(false); return }
    // TOKEN_REFRESHED / USER_UPDATED do mesmo usuário: mantém o contexto e a tela — não pisca "Carregando…"
    if (uidAtual.current === u.id) return
    uidAtual.current = u.id
    setLoading(true)
    void carregarContexto(u)
  }

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => trocarSessao(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => trocarSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    loading, user, orgs, org, role,
    setOrg: (id) => {
      const par = orgs.find((o) => o.org.id === id)
      if (!par) return
      setOrgState(par.org); setRole(par.role); localStorage.setItem('ga_org', id)
    },
    reload: async () => { if (user) await carregarContexto(user) },
    signOut: async () => { await sb.auth.signOut() },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
