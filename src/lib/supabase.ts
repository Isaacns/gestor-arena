import { createClient } from '@supabase/supabase-js'

// TODO: substituir por tipos gerados (`supabase gen types typescript`) e tipar o client.
const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const sb = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export type OrgTipo = 'arena' | 'escola'
export interface Organization {
  id: string
  tipo: OrgTipo
  nome: string
  slug: string
  status: string
  telefone: string | null
  email: string | null
  cidade: string | null
  uf: string | null
}
export interface Membership { org_id: string; role: string; ativo: boolean; organizations: Organization | null }
