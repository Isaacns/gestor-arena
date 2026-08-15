import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useToast } from '../ui/kit'
import { Logo } from '../ui/Logo'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmt = (s: string | null) => s ? s.split('-').reverse().join('/') : '—'
const hhmm = (t?: string | null) => (t ?? '').slice(0, 5)
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const PRES: Record<string, { label: string; cor: string }> = {
  presente: { label: 'Presente', cor: '#16A34A' }, ausente: { label: 'Falta', cor: '#DC2626' },
  justificada: { label: 'Justificada', cor: '#F59E0B' }, reposicao: { label: 'Reposição', cor: '#0284C7' },
}
interface Dados {
  aluno: { nome: string; situacao: string }; org: string
  turmas: { nome: string; dias: number[] | null; inicio: string | null; fim: string | null; professor: string | null }[]
  presencas: { data: string; status: string; turma: string }[]
  cobrancas: { descricao: string; valor: number; vencimento: string; status: string; valor_pago: number; invoice_url: string | null; pix: string | null }[]
}

export default function PortalAluno({ token }: { token: string }) {
  const toast = useToast()
  const [d, setD] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    void sb.rpc('portal_aluno', { p_token: token }).then(({ data }) => { if (vivo) { setD(data as Dados | null); setLoading(false) } })
    return () => { vivo = false }
  }, [token])

  function cobChip(c: Dados['cobrancas'][0]) {
    if (c.status === 'pago') return <span className="ga-chip ga-chip-ok">Pago</span>
    if (c.vencimento < hojeIso()) return <span className="ga-chip ga-chip-danger">Vencida</span>
    return <span className="ga-chip ga-chip-warn">Em aberto</span>
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px 16px', position: 'relative' }}>
      <div className="ga-aura" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}><Logo size={32} /></div>

        {loading ? <div className="ga-card"><p style={{ color: 'var(--tx2)', fontSize: 14 }}>Carregando…</p></div>
          : !d ? (
            <div className="ga-card">
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Link inválido</h1>
              <p style={{ color: 'var(--tx2)', fontSize: 14 }}>Este link do portal não é válido. Peça um novo para a escola.</p>
            </div>
          ) : (
            <>
              <div className="ga-card">
                <span style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{d.org}</span>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: '2px 0 0' }}>Olá, {d.aluno.nome.split(' ')[0]} 👋</h1>
                <p style={{ color: 'var(--tx2)', fontSize: 13, margin: '2px 0 0' }}>Aqui você acompanha suas turmas, presença e mensalidades.</p>
              </div>

              <Secao titulo="Minhas turmas">
                {d.turmas.length === 0 ? <Vazio>Nenhuma turma ativa.</Vazio> : d.turmas.map((t, i) => (
                  <div key={i} className="ga-agrow">
                    <span style={{ flex: 1 }}><b style={{ fontSize: 14, display: 'block' }}>{t.nome}</b>
                      <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{(t.dias ?? []).map((x) => DIAS[x]).join(', ') || '—'}{t.inicio ? ` · ${hhmm(t.inicio)}${t.fim ? '–' + hhmm(t.fim) : ''}` : ''}{t.professor ? ` · Prof. ${t.professor}` : ''}</span>
                    </span>
                  </div>
                ))}
              </Secao>

              <Secao titulo="Mensalidades">
                {d.cobrancas.length === 0 ? <Vazio>Nenhuma cobrança.</Vazio> : d.cobrancas.map((c, i) => (
                  <div key={i} className="ga-agrow" style={{ alignItems: 'flex-start' }}>
                    <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 14, display: 'block' }}>{c.descricao}</b>
                      <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{brl(c.valor)} · vence {fmt(c.vencimento)}</span>
                      {c.status === 'pendente' && (c.invoice_url || c.pix) && (
                        <span style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          {c.invoice_url && <a className="ga-chip ga-chip-info" style={{ textDecoration: 'none', cursor: 'pointer' }} href={c.invoice_url} target="_blank" rel="noreferrer">Pagar / boleto</a>}
                          {c.pix && <button type="button" className="ga-chip ga-chip-ok" style={{ border: 'none', cursor: 'pointer' }} onClick={() => { navigator.clipboard?.writeText(c.pix!); toast('PIX copiado.') }}>Copiar PIX</button>}
                        </span>
                      )}
                    </span>
                    {cobChip(c)}
                  </div>
                ))}
              </Secao>

              <Secao titulo="Presença recente">
                {d.presencas.length === 0 ? <Vazio>Sem registros nos últimos 60 dias.</Vazio> : d.presencas.map((p, i) => (
                  <div key={i} className="ga-agrow">
                    <span className="ga-agrow-h" style={{ minWidth: 74 }}>{fmt(p.data)}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{p.turma}</span>
                    <span className="ga-chip" style={{ color: PRES[p.status]?.cor ?? 'var(--tx2)', background: (PRES[p.status]?.cor ?? '#94A3B8') + '1F' }}>{PRES[p.status]?.label ?? p.status}</span>
                  </div>
                ))}
              </Secao>

              <p style={{ fontSize: 11, color: 'var(--tx3)', textAlign: 'center', marginTop: 18 }}>Gestor Arena · um produto VIZIO</p>
            </>
          )}
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div className="ga-card" style={{ marginTop: 14 }}><div className="ga-card-h"><b>{titulo}</b></div>{children}</div>
}
function Vazio({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: 'var(--tx2)', padding: '6px 2px' }}>{children}</p>
}
