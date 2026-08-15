import { useEffect, useMemo, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Student } from '../lib/database.types'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, baixarCSV, errMsg, inp, useToast } from '../ui/kit'

type CobStatus = 'pendente' | 'pago' | 'cancelado' | 'estornado'
interface Cobranca {
  id: string; org_id: string; student_id: string | null; sacado_nome: string | null; descricao: string
  competencia: string | null; valor: number; vencimento: string; status: CobStatus; valor_pago: number
  pago_em: string | null; forma_pagamento: string | null; invoice_url: string | null; pix_payload: string | null
  student?: { nome: string } | null
}
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function isoLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const hojeIso = () => isoLocal(new Date())
const mesAtual = () => hojeIso().slice(0, 7)
const fmtData = (s: string) => s.split('-').reverse().join('/')

function chip(c: Cobranca) {
  if (c.status === 'pago') return <span className="ga-chip ga-chip-ok">Pago</span>
  if (c.status === 'cancelado') return <span className="ga-chip ga-chip-muted">Cancelado</span>
  if (c.status === 'estornado') return <span className="ga-chip ga-chip-muted">Estornado</span>
  if (c.vencimento < hojeIso()) return <span className="ga-chip ga-chip-danger">Vencido</span>
  return <span className="ga-chip ga-chip-warn">Pendente</span>
}

export default function Financeiro() {
  const { org, role } = useAuth()
  const toast = useToast()
  const pode = ['owner', 'admin', 'gerente', 'financeiro'].includes(role ?? '')
  const ehEscola = org?.tipo === 'escola'
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Cobranca[]>([])
  const [mes, setMes] = useState(mesAtual())
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'vencidas' | 'pagas'>('todas')
  const [nova, setNova] = useState(false)
  const [gerar, setGerar] = useState(false)
  const [baixar, setBaixar] = useState<Cobranca | null>(null)

  async function carregar() {
    if (!org) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('cobrancas').select('*, student:students(nome)').eq('org_id', org.id).order('vencimento', { ascending: false })
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as Cobranca[]) ?? []); setLoading(false)
  }
  useEffect(() => { if (pode) void carregar() }, [org, pode])

  const visiveis = useMemo(() => lista.filter((c) => {
    const noMes = (c.competencia ?? c.vencimento).slice(0, 7) === mes
    if (!noMes && filtro !== 'vencidas') return false
    if (filtro === 'pendentes') return c.status === 'pendente'
    if (filtro === 'pagas') return c.status === 'pago'
    if (filtro === 'vencidas') return c.status === 'pendente' && c.vencimento < hojeIso()
    return true
  }), [lista, mes, filtro])

  const kpi = useMemo(() => {
    const doMes = lista.filter((c) => (c.competencia ?? c.vencimento).slice(0, 7) === mes)
    const recebido = lista.filter((c) => c.status === 'pago' && (c.pago_em ?? '').slice(0, 7) === mes).reduce((s, c) => s + Number(c.valor_pago), 0)
    const aVencer = doMes.filter((c) => c.status === 'pendente' && c.vencimento >= hojeIso()).reduce((s, c) => s + (Number(c.valor) - Number(c.valor_pago)), 0)
    const vencido = lista.filter((c) => c.status === 'pendente' && c.vencimento < hojeIso()).reduce((s, c) => s + (Number(c.valor) - Number(c.valor_pago)), 0)
    return { recebido, aVencer, vencido, n: doMes.length }
  }, [lista, mes])

  async function cancelar(c: Cobranca) {
    if (!confirm(`Cancelar a cobrança "${c.descricao}"?`)) return
    const { error } = await sb.rpc('cancelar_cobranca', { p_id: c.id, p_motivo: null })
    if (error) return toast(errMsg(error), true)
    toast('Cobrança cancelada.'); void carregar()
  }
  async function estornar(c: Cobranca) {
    if (!confirm(`Estornar o pagamento de "${c.descricao}"? Ela volta a ficar em aberto.`)) return
    const { error } = await sb.rpc('estornar_cobranca', { p_id: c.id, p_motivo: null })
    if (error) return toast(errMsg(error), true)
    toast('Pagamento estornado.'); void carregar()
  }
  async function cobrar(c: Cobranca) {
    toast('Gerando cobrança no Asaas…')
    const { data, error } = await sb.functions.invoke('asaas-cobranca', { body: { cobranca_id: c.id, tipo: 'UNDEFINED' } })
    if (error) return toast('Não foi possível gerar a cobrança.', true)
    const d = data as { dormant?: boolean; error?: string; invoiceUrl?: string }
    if (d?.dormant) return toast('Gateway Asaas ainda não está ligado (configure em Configurações).', true)
    if (d?.error) return toast(d.error, true)
    if (d?.invoiceUrl) { window.open(d.invoiceUrl, '_blank'); toast('Cobrança gerada.'); void carregar() }
  }
  function exportar() {
    const linhas: (string | number | null)[][] = [['Sacado', 'Descrição', 'Competência', 'Vencimento', 'Valor', 'Pago', 'Situação']]
    visiveis.forEach((c) => linhas.push([
      c.student?.nome ?? c.sacado_nome ?? '', c.descricao, c.competencia ?? '', c.vencimento,
      Number(c.valor).toFixed(2), Number(c.valor_pago).toFixed(2),
      c.status === 'pendente' && c.vencimento < hojeIso() ? 'vencido' : c.status,
    ]))
    baixarCSV(`financeiro-${mes}.csv`, linhas)
  }

  if (!pode) return <div className="ga-card"><Empty ico="🔒" titulo="Sem acesso ao financeiro" texto="O financeiro é visível para proprietário, administrador, gerente e financeiro. Fale com quem administra a organização." /></div>

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="ga-kpis">
        <Kpi label="Recebido no mês" value={brl(kpi.recebido)} tone="ok" />
        <Kpi label="A vencer no mês" value={brl(kpi.aVencer)} tone="brand" />
        <Kpi label="Vencido (inadimplência)" value={brl(kpi.vencido)} tone={kpi.vencido > 0 ? 'danger' : undefined} />
        <Kpi label="Lançamentos no mês" value={kpi.n} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="month" style={{ ...inp, width: 'auto' }} value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" />
        <select style={{ ...inp, width: 'auto' }} value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar por situação">
          <option value="todas">Todas</option><option value="pendentes">Pendentes</option><option value="vencidas">Vencidas (todas)</option><option value="pagas">Pagas</option>
        </select>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{visiveis.length} cobrança(s)</span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <BtnSm onClick={exportar} disabled={visiveis.length === 0}>⬇ CSV</BtnSm>
          {ehEscola && <BtnSm onClick={() => setGerar(true)}>📅 Gerar mensalidades</BtnSm>}
          <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setNova(true)}>+ Nova cobrança</button>
        </div>
      </div>

      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : visiveis.length === 0 ? (
          <Empty ico="💰" titulo="Nada por aqui neste mês" texto={ehEscola ? 'Gere as mensalidades do mês ou crie uma cobrança avulsa.' : 'Crie uma cobrança (locação, contrato, avulsa).'} />
        ) : (
          <div className="ga-tablewrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Sacado', 'Descrição', 'Vencimento', 'Valor', 'Situação', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{visiveis.map((c) => (
                <tr key={c.id}>
                  <td style={td}><b>{c.student?.nome ?? c.sacado_nome ?? '—'}</b></td>
                  <td style={td}>{c.descricao}</td>
                  <td style={td}>{fmtData(c.vencimento)}</td>
                  <td style={td}>{brl(c.valor)}{c.status === 'pago' && c.valor_pago < c.valor ? ` (pago ${brl(c.valor_pago)})` : ''}</td>
                  <td style={td}>{chip(c)}</td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {c.status === 'pendente' && <>
                      {c.invoice_url
                        ? <BtnSm onClick={() => window.open(c.invoice_url!, '_blank')} style={{ marginRight: 6 }}>2ª via</BtnSm>
                        : <BtnSm onClick={() => void cobrar(c)} style={{ marginRight: 6 }}>Cobrar</BtnSm>}
                      {c.pix_payload && <BtnSm onClick={() => { navigator.clipboard?.writeText(c.pix_payload!); toast('PIX copiado.') }} style={{ marginRight: 6 }}>PIX</BtnSm>}
                      <BtnSm onClick={() => setBaixar(c)} style={{ marginRight: 6 }}>Dar baixa</BtnSm><BtnSm danger onClick={() => void cancelar(c)}>Cancelar</BtnSm>
                    </>}
                    {c.status === 'pago' && <BtnSm danger onClick={() => void estornar(c)}>Estornar</BtnSm>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {nova && <NovaCobranca ehEscola={ehEscola} onClose={() => setNova(false)} onSaved={() => { setNova(false); void carregar() }} />}
      {gerar && <GerarMensalidades mes={mes} onClose={() => setGerar(false)} onSaved={() => { setGerar(false); void carregar() }} />}
      {baixar && <BaixaModal cob={baixar} onClose={() => setBaixar(null)} onSaved={() => { setBaixar(null); void carregar() }} />}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: 'ok' | 'brand' | 'danger' }) {
  const cor = tone === 'ok' ? 'var(--ok)' : tone === 'danger' ? 'var(--danger)' : tone === 'brand' ? 'var(--brand)' : 'var(--tx)'
  return <div className="ga-card ga-kpi"><div style={{ fontSize: 12, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 700, color: cor }}>{value}</div></div>
}

function GerarMensalidades({ mes, onClose, onSaved }: { mes: string; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [m, setM] = useState(mes); const [busy, setBusy] = useState(false)
  async function gerar() {
    if (!org) return
    setBusy(true)
    const { data, error } = await sb.rpc('gerar_mensalidades', { p_org: org.id, p_competencia: m + '-01' })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    const n = (data as { criadas: number } | null)?.criadas ?? 0
    toast(n > 0 ? `${n} mensalidade(s) gerada(s).` : 'Nenhuma nova mensalidade (já geradas ou sem turmas com valor).'); onSaved()
  }
  return (
    <Modal title="Gerar mensalidades do mês" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>Cria uma cobrança para cada aluno matriculado em turma com mensalidade, com vencimento no dia 10. É seguro rodar de novo — não duplica.</p>
      <Field label="Mês de referência"><input type="month" style={inp} value={m} onChange={(e) => setM(e.target.value)} /></Field>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void gerar()}>{busy ? 'Gerando…' : 'Gerar'}</button></Foot>
    </Modal>
  )
}

function NovaCobranca({ ehEscola, onClose, onSaved }: { ehEscola: boolean; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth(); const toast = useToast()
  const [alunos, setAlunos] = useState<Student[]>([])
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [student, setStudent] = useState(''); const [customerId, setCustomerId] = useState(''); const [sacado, setSacado] = useState('')
  const [descricao, setDescricao] = useState(''); const [valor, setValor] = useState(''); const [venc, setVenc] = useState(hojeIso())
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!org) return
    if (ehEscola) void sb.from('students').select('id, nome').eq('org_id', org.id).not('situacao', 'in', '("cancelado","arquivado")').order('nome').then(({ data }) => setAlunos((data as Student[]) ?? []))
    else void sb.from('customers').select('id, nome').eq('org_id', org.id).eq('ativo', true).order('nome').then(({ data }) => setClientes((data as { id: string; nome: string }[]) ?? []))
  }, [ehEscola, org])
  async function salvar() {
    if (!org) return
    if (!descricao.trim()) return toast('Informe a descrição.', true)
    if (!valor || Number(valor) <= 0) return toast('Informe um valor válido.', true)
    setBusy(true)
    const { error } = await sb.rpc('criar_cobranca', { p_org: org.id, p_customer: customerId || null, p_student: student || null, p_sacado: sacado.trim() || null, p_descricao: descricao.trim(), p_valor: Number(valor), p_vencimento: venc, p_competencia: null })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Cobrança criada.'); onSaved()
  }
  return (
    <Modal title="Nova cobrança" onClose={onClose}>
      {ehEscola ? (
        <Field label="Aluno (opcional)"><select style={inp} value={student} onChange={(e) => setStudent(e.target.value)}>
          <option value="">— sem aluno vinculado —</option>{alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select></Field>
      ) : (
        <>
          <Field label="Cliente (opcional)"><select style={inp} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— avulso / sem cadastro —</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></Field>
          {!customerId && <Field label="Nome do sacado (se não cadastrado)"><input style={inp} placeholder="Ex.: Escolinha do João" value={sacado} onChange={(e) => setSacado(e.target.value)} /></Field>}
        </>
      )}
      <Field label="Descrição *"><input style={inp} placeholder={ehEscola ? 'Ex.: Uniforme, taxa de matrícula' : 'Ex.: Locação quadra 01 — janeiro'} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Valor (R$) *"><input type="number" min={0} step="0.01" style={inp} placeholder="280" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        <Field label="Vencimento"><input type="date" style={inp} value={venc} onChange={(e) => setVenc(e.target.value)} /></Field>
      </div>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Criar'}</button></Foot>
    </Modal>
  )
}

function BaixaModal({ cob, onClose, onSaved }: { cob: Cobranca; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const restante = Number(cob.valor) - Number(cob.valor_pago)
  const [valor, setValor] = useState(String(restante.toFixed(2)))
  const [forma, setForma] = useState('pix'); const [data, setData] = useState(hojeIso()); const [busy, setBusy] = useState(false)
  async function dar() {
    setBusy(true)
    const { error } = await sb.rpc('baixar_cobranca', { p_id: cob.id, p_valor_pago: Number(valor), p_forma: forma, p_data: data })
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Baixa registrada.'); onSaved()
  }
  return (
    <Modal title="Dar baixa (registrar pagamento)" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '-4px 0 12px' }}>{cob.descricao} · {brl(cob.valor)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Valor pago (R$)"><input type="number" min={0} step="0.01" style={inp} value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        <Field label="Data"><input type="date" style={inp} value={data} onChange={(e) => setData(e.target.value)} /></Field>
      </div>
      <Field label="Forma"><select style={inp} value={forma} onChange={(e) => setForma(e.target.value)}>
        <option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="transferencia">Transferência</option>
      </select></Field>
      <Foot><BtnGhost onClick={onClose}>Cancelar</BtnGhost><button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void dar()}>{busy ? 'Salvando…' : 'Confirmar baixa'}</button></Foot>
    </Modal>
  )
}
const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
