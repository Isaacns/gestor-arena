// Tipos do schema (subconjunto usado pela UI). Origem: `supabase gen types typescript`
// (gerado em 13/08/2026). Ao evoluir o schema, regenerar e ampliar.

export type AlunoSituacao = 'lead' | 'experimental' | 'ativo' | 'pausado' | 'cancelado' | 'arquivado'
export type MatriculaStatus = 'ativa' | 'pausada' | 'cancelada' | 'concluida'
export type PresencaStatus = 'presente' | 'ausente' | 'justificada' | 'reposicao' | 'experimental'
export type ProfFuncao = 'professor' | 'coordenador' | 'recepcao' | 'auxiliar'
export type OrgTipo = 'arena' | 'escola'
export type AppRole =
  | 'owner' | 'admin' | 'gerente' | 'financeiro' | 'recepcao'
  | 'operacional' | 'coordenador' | 'professor' | 'visualizador'

export interface Organization {
  id: string; tipo: OrgTipo; nome: string; slug: string; status: string
  telefone: string | null; email: string | null; cidade: string | null; uf: string | null
}
export interface Sport { id: string; slug: string; nome: string; ativo: boolean }

export interface Student {
  id: string; org_id: string; nome: string; telefone: string | null
  responsavel: string | null; responsavel_telefone: string | null
  data_nascimento: string | null; sport_id: string | null; nivel: string | null
  situacao: AlunoSituacao; origem: string | null; obs: string | null; criado_em: string
}
export interface Professional {
  id: string; org_id: string; nome: string; funcao: ProfFuncao
  telefone: string | null; email: string | null; user_id: string | null; ativo: boolean; obs: string | null
}
export interface ClassRow {
  id: string; org_id: string; nome: string; sport_id: string | null; nivel: string | null
  professor_id: string | null; capacidade: number; dias_semana: number[]
  hora_inicio: string | null; hora_fim: string | null; mensalidade: number | null
  arena_org_id: string | null; court_id: string | null; external_venue_id: string | null
  recurring_id: string | null; ativo: boolean; obs: string | null
}
export interface Enrollment {
  id: string; org_id: string; class_id: string; student_id: string
  status: MatriculaStatus; data_matricula: string
}
export interface Attendance {
  id: string; org_id: string; class_id: string; student_id: string
  data: string; status: PresencaStatus; obs: string | null
}
export interface Unit {
  id: string; org_id: string; nome: string; endereco: string | null
  cidade: string | null; uf: string | null; ativo: boolean
}
export interface Court {
  id: string; org_id: string; unit_id: string; nome: string; sport_id: string | null
  capacidade: number | null; coberta: boolean; iluminacao: boolean; ativo: boolean; obs: string | null
}
export interface ExternalVenue {
  id: string; org_id: string; nome: string; endereco: string | null
  cidade: string | null; uf: string | null; telefone: string | null; ativo: boolean; obs: string | null
}
export type ReservaTipo = 'aula' | 'locacao' | 'bloqueio' | 'manutencao' | 'cortesia' | 'evento'
export type VinculoStatus = 'pendente' | 'ativo' | 'suspenso' | 'encerrado'

// retornos de RPC (client não-tipado; cast nas telas)
export interface AgendaQuadra {
  court_id: string; court_nome: string; unit_nome: string | null; sport_nome: string | null
  arena_org_id: string; arena_nome: string; sou_dono: boolean
}
export interface AgendaReserva {
  id: string; court_id: string; org_id: string; data: string
  hora_inicio: string; hora_fim: string; tipo: ReservaTipo | null
  titulo: string; sou_dono: boolean; dono_nome: string | null; recurring_id: string | null
}
export interface Vinculo {
  id: string; status: VinculoStatus; criado_por_org: string; eu_criei: boolean
  compartilha_contatos: boolean; compartilha_agenda: boolean
  parceiro_id: string; parceiro_nome: string; parceiro_tipo: OrgTipo
  parceiro_cidade: string | null; parceiro_uf: string | null
  parceiro_telefone: string | null; parceiro_email: string | null
}
export interface MembershipRow { user_id: string; role: AppRole; ativo: boolean; profiles: { nome: string | null; email: string | null; foto_url: string | null } | null }
