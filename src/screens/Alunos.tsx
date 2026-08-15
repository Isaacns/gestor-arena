import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { AlunoSituacao, Student } from '../lib/database.types'
import { Badge, BtnGhost, BtnSm, Empty, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const SITU: Record<AlunoSituacao, { label: string; cor: string }> = {
  lead: { label: 'Lead', cor: '#0284C7' },
  experimental: { label: 'Experimental', cor: '#38BDF8' },
  ativo: { label: 'Ativo', cor: '#16A34A' },
  pausado: { label: 'Pausado', cor: '#F59E0B' },
  cancelado: { label: 'Cancelado', cor: '#94A3B8' },
  arquivado: { label: 'Ex-aluno', cor: '#64748B' },
}
const ORDEM: AlunoSituacao[] = ['lead', 'experimental', 'ativo', 'pausado', 'cancelado', 'arquivado']

export default function Alunos() {
  const { org, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [lista, setLista] = useState<Student[]>([])
  const [filtro, setFiltro] = useState<AlunoSituacao | 'todos'>('todos')
  const [edit, setEdit] = useState<Partial<Student> | null>(null)
  const [portalDe, setPortalDe] = useState<Student | null>(null)
  const [detalhe, setDetalhe] = useState<Student | null>(null)
  const podeEditar = ['owner', 'admin', 'gerente', 'coordenador', 'recepcao'].includes(role ?? '')

  async function carregar() {
    if (!org) return
    setLoading(true)
    const { data, error } = await sb.from('students').select('*').eq('org_id', org.id).order('nome')
    if (error) toast(errMsg(error), true)
    setLista((data as Student[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [org])

  const visiveis = filtro === 'todos' ? lista : lista.filter((s) => s.situacao === filtro)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as AlunoSituacao | 'todos')} style={{ ...inp, width: 'auto' }}>
          <option value="todos">Todas as situações</option>
          {ORDEM.map((s) => <option key={s} value={s}>{SITU[s].label}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{visiveis.length} aluno(s)</span>
        {podeEditar && <button className="ga-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo aluno</button>}
      </div>

      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : visiveis.length === 0 ? (
          <Empty ico="🎓" titulo="Nenhum aluno" texto="Cadastre alunos e acompanhe o funil: lead → experimental → ativo.">
            {podeEditar && <button className="ga-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar aluno</button>}
          </Empty>
        ) : (
          <table className="ga-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Nome', 'Contato', 'Nível', 'Situação', ''].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {visiveis.map((s) => (
                <tr key={s.id}>
                  <td style={td}><button type="button" onClick={() => setDetalhe(s)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--brand)', font: 'inherit', fontWeight: 700, textAlign: 'left' }}>{s.nome}</button></td>
                  <td style={td}>{s.telefone ?? s.responsavel ?? '—'}</td>
                  <td style={td}>{s.nivel ?? '—'}</td>
                  <td style={td}><Badge color={SITU[s.situacao].cor}>{SITU[s.situacao].label}</Badge></td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{podeEditar && <><BtnSm onClick={() => setPortalDe(s)} style={{ marginRight: 6 }}>🔗 Portal</BtnSm><BtnSm onClick={() => setEdit(s)}>Editar</BtnSm></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && <EditarAluno aluno={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
      {portalDe && <PortalLink aluno={portalDe} onClose={() => setPortalDe(null)} />}
      {detalhe && <DetalheAluno aluno={detalhe} onClose={() => setDetalhe(null)} />}
    </div>
  )
}

function DetalheAluno({ aluno, onClose }: { aluno: Student; onClose: () => void }) {
  const [turmas, setTurmas] = useState<{ class: { nome: string; dias_semana: number[] | null; hora_inicio: string | null; hora_fim: string | null } | null }[]>([])
  const [pres, setPres] = useState<{ data: string; status: string; class: { nome: string } | null }[]>([])
  const [cobs, setCobs] = useState<{ descricao: string; valor: number; vencimento: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmt = (s: string) => s.split('-').reverse().join('/')
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [e, a, c] = await Promise.all([
        sb.from('enrollments').select('class:classes(nome,dias_semana,hora_inicio,hora_fim)').eq('student_id', aluno.id).eq('status', 'ativa'),
        sb.from('attendance').select('data,status, class:classes(nome)').eq('student_id', aluno.id).order('data', { ascending: false }).limit(20),
        sb.from('cobrancas').select('descricao,valor,vencimento,status').eq('student_id', aluno.id).order('vencimento', { ascending: false }).limit(12),
      ])
      if (!vivo) return
      setTurmas((e.data as unknown as typeof turmas) ?? []); setPres((a.data as unknown as typeof pres) ?? []); setCobs((c.data as unknown as typeof cobs) ?? []); setLoading(false)
    })()
    return () => { vivo = false }
  }, [aluno.id])
  return (
    <Modal title={aluno.nome} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Badge color={SITU[aluno.situacao].cor}>{SITU[aluno.situacao].label}</Badge>
        {aluno.telefone && <span style={{ fontSize: 13, color: 'var(--tx2)' }}>📞 {aluno.telefone}</span>}
        {aluno.responsavel && <span style={{ fontSize: 13, color: 'var(--tx2)' }}>👪 {aluno.responsavel}</span>}
        {aluno.documento && <span style={{ fontSize: 13, color: 'var(--tx2)' }}>🪪 {aluno.documento}</span>}
      </div>
      {loading ? <Loading /> : <>
        <Bloco titulo="Turmas ativas">
          {turmas.length === 0 ? <Nada>Sem matrícula ativa.</Nada> : turmas.map((t, i) => (
            <div key={i} style={{ fontSize: 13, padding: '4px 0' }}><b>{t.class?.nome ?? '—'}</b> <span style={{ color: 'var(--tx2)' }}>{(t.class?.dias_semana ?? []).map((d) => DIAS[d]).join(', ')}{t.class?.hora_inicio ? ` · ${t.class.hora_inicio.slice(0, 5)}` : ''}</span></div>
          ))}
        </Bloco>
        {cobs.length > 0 && <Bloco titulo="Mensalidades">
          {cobs.map((c, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span>{c.descricao} · {fmt(c.vencimento)}</span><span><b>{brl(c.valor)}</b> · {c.status === 'pago' ? '✅' : c.vencimento < new Date().toISOString().slice(0, 10) ? '🔴' : '⏳'}</span></div>)}
        </Bloco>}
        <Bloco titulo="Presença recente">
          {pres.length === 0 ? <Nada>Sem registros.</Nada> : pres.map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span>{fmt(p.data)} · {p.class?.nome ?? ''}</span><span style={{ color: 'var(--tx2)' }}>{p.status}</span></div>)}
        </Bloco>
      </>}
      <Foot><button className="ga-btn" style={{ width: 'auto' }} onClick={onClose}>Fechar</button></Foot>
    </Modal>
  )
}
function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{titulo}</div>{children}</div>
}
function Nada({ children }: { children: React.ReactNode }) { return <p style={{ fontSize: 13, color: 'var(--tx2)', margin: 0 }}>{children}</p> }

function PortalLink({ aluno, onClose }: { aluno: Student; onClose: () => void }) {
  const toast = useToast()
  const [link, setLink] = useState('')
  const [erro, setErro] = useState(false)
  useEffect(() => {
    let vivo = true
    void sb.rpc('gerar_token_portal', { p_student: aluno.id }).then(({ data, error }) => {
      if (!vivo) return
      if (error || !data) { setErro(true); return }
      setLink(`${window.location.origin}/?portal=${data}`)
    })
    return () => { vivo = false }
  }, [aluno.id])
  return (
    <Modal title={`Portal de ${aluno.nome}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>Link pessoal (só leitura) para o aluno/responsável ver turmas, presença e mensalidades. Gerar de novo invalida o link anterior.</p>
      {erro ? <p style={{ fontSize: 13, color: 'var(--danger)' }}>Não foi possível gerar o link.</p>
        : !link ? <p style={{ fontSize: 13, color: 'var(--tx2)' }}>Gerando…</p>
          : <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, minWidth: 0, background: 'var(--bg2)', border: '1px dashed var(--line2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--brand)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</code>
              <BtnSm onClick={() => { navigator.clipboard?.writeText(link); toast('Link copiado.') }}>Copiar</BtnSm>
            </div>}
      <Foot><button className="ga-btn" style={{ width: 'auto' }} onClick={onClose}>Concluir</button></Foot>
    </Modal>
  )
}

function EditarAluno({ aluno, onClose, onSaved }: { aluno: Partial<Student>; onClose: () => void; onSaved: () => void }) {
  const { org } = useAuth()
  const toast = useToast()
  const [f, setF] = useState<Partial<Student>>({ situacao: 'lead', ...aluno })
  const [busy, setBusy] = useState(false)
  const editando = !!aluno.id
  function set<K extends keyof Student>(k: K, v: Student[K]) { setF((s) => ({ ...s, [k]: v })) }

  async function salvar() {
    if (!org) return
    if (!f.nome?.trim()) { toast('Informe o nome.', true); return }
    setBusy(true)
    const dados = {
      org_id: org.id, nome: f.nome.trim(),
      telefone: f.telefone || null, responsavel: f.responsavel || null,
      responsavel_telefone: f.responsavel_telefone || null, nivel: f.nivel || null,
      situacao: f.situacao ?? 'lead', origem: f.origem || null, obs: f.obs || null,
      documento: f.documento || null,
    }
    const { error } = editando
      ? await sb.from('students').update(dados).eq('id', aluno.id!)
      : await sb.from('students').insert(dados)
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast(editando ? 'Aluno atualizado.' : 'Aluno cadastrado.')
    onSaved()
  }

  return (
    <Modal title={editando ? 'Editar aluno' : 'Novo aluno'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Telefone"><input style={inp} value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Field>
        <Field label="Nível"><input style={inp} placeholder="iniciante…" value={f.nivel ?? ''} onChange={(e) => set('nivel', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Responsável"><input style={inp} value={f.responsavel ?? ''} onChange={(e) => set('responsavel', e.target.value)} /></Field>
        <Field label="Tel. responsável"><input style={inp} value={f.responsavel_telefone ?? ''} onChange={(e) => set('responsavel_telefone', e.target.value)} /></Field>
      </div>
      <Field label="CPF do aluno/responsável (para cobrança)"><input style={inp} value={f.documento ?? ''} onChange={(e) => set('documento', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Situação">
          <select style={inp} value={f.situacao ?? 'lead'} onChange={(e) => set('situacao', e.target.value as AlunoSituacao)}>
            {ORDEM.map((s) => <option key={s} value={s}>{SITU[s].label}</option>)}
          </select>
        </Field>
        <Field label="Origem (lead)"><input style={inp} placeholder="Indicação, Instagram…" value={f.origem ?? ''} onChange={(e) => set('origem', e.target.value)} /></Field>
      </div>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </Foot>
    </Modal>
  )
}

const th: React.CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
