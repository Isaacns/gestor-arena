// Fonte ÚNICA das novidades (§19). Publica JUNTO com o deploy — sem INSERT manual no banco.
//
// Para lançar uma versão: adicione um item no TOPO da lista e faça o deploy normal.
// A `ordem` e a versão exibida (Config) derivam daqui — não há segunda fonte a sincronizar.
export type Versao = { versao: string; titulo: string; resumo?: string; itens: string[]; data: string }

export const VERSOES: Versao[] = [
  {
    versao: '0.5.0', titulo: 'Central de Novidades', resumo: 'Fique por dentro.', data: '2026-08-18',
    itens: [
      'Esta tela: toda atualização aparece aqui, da mais nova para a mais antiga.',
      'Ela abre sozinha quando há algo novo que você ainda não viu.',
      'O sino continua com seus alertas; o ✨ no topo traz as novidades.',
    ],
  },
  {
    versao: '0.4.0', titulo: 'Sistemas vivos', resumo: 'O painel ganhou vida.', data: '2026-08-18',
    itens: [
      'Os números do início contam até o valor quando a tela abre.',
      'As barras de ocupação enchem em cascata, como um tanque enchendo.',
      'Cartões entram suavemente — e tudo respeita quem prefere menos animação.',
    ],
  },
  {
    versao: '0.3.0', titulo: 'Pagamentos e portal', resumo: 'Cobrar ficou fácil.', data: '2026-08-17',
    itens: [
      'Cobrança por PIX e boleto nas mensalidades (Asaas).',
      'Portal do aluno: ele acompanha turmas e mensalidades.',
      'Busca do topo abre a ficha do aluno, quadra ou professor direto.',
    ],
  },
  {
    versao: '0.2.0', titulo: 'Gestão completa', resumo: 'Muito além da agenda.', data: '2026-08-15',
    itens: [
      'Financeiro com mensalidades, baixa de pagamento e 2ª via.',
      'Clientes, Estoque, Manutenção e Relatórios.',
      'Convide a equipe por link e crie usuários com papel.',
    ],
  },
  {
    versao: '0.1.0', titulo: 'Lançamento', resumo: 'O começo do Gestor Arena.', data: '2026-08-13',
    itens: [
      'Agenda de quadras, unidades e reservas.',
      'Escola: turmas, alunos e professores.',
      'Parcerias entre a arena e as escolinhas.',
    ],
  },
]

// ordem = semver real (major*1e6 + minor*1e3 + patch) — p/ ordenar e comparar "visto".
export function ordemDe(versao: string): number {
  const [a = 0, b = 0, c = 0] = versao.split('.').map((n) => parseInt(n, 10) || 0)
  return a * 1_000_000 + b * 1_000 + c
}

// lista já garantida em ordem decrescente (não depende da ordem de digitação)
export const VERSOES_DESC = [...VERSOES].sort((x, y) => ordemDe(y.versao) - ordemDe(x.versao))
export const VERSAO_ATUAL = VERSOES_DESC[0]?.versao ?? '0.0.0'
export const ORDEM_ATUAL = ordemDe(VERSAO_ATUAL)
