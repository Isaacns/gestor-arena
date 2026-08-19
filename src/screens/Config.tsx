import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnSm, Field, errMsg, inp, useToast } from '../ui/kit'

const APP_VERSION = '0.5.0'

export default function Config() {
  const { org, role, reload } = useAuth()
  const toast = useToast()
  const pode = ['owner', 'admin'].includes(role ?? '')
  const podeFin = ['owner', 'admin', 'gerente', 'financeiro'].includes(role ?? '')
  const [f, setF] = useState({ nome: org?.nome ?? '', telefone: org?.telefone ?? '', email: org?.email ?? '', cidade: org?.cidade ?? '', uf: org?.uf ?? '' })
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  async function salvar() {
    if (!org) return
    if (!f.nome.trim()) return toast('Nome é obrigatório.', true)
    setBusy(true)
    const { error } = await sb.from('organizations').update({
      nome: f.nome.trim(), telefone: f.telefone || null, email: f.email || null,
      cidade: f.cidade || null, uf: (f.uf || '').toUpperCase() || null,
    }).eq('id', org.id)
    setBusy(false)
    if (error) return toast(errMsg(error), true)
    toast('Dados salvos.'); await reload()
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="ga-card">
        <b>Dados da organização</b>
        <div style={{ marginTop: 14 }}>
          <Field label="Nome"><input style={inp} value={f.nome} disabled={!pode} onChange={(e) => set('nome', e.target.value)} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Telefone (WhatsApp)"><input style={inp} value={f.telefone} disabled={!pode} onChange={(e) => set('telefone', e.target.value)} /></Field>
            <Field label="E-mail"><input style={inp} value={f.email} disabled={!pode} onChange={(e) => set('email', e.target.value)} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Field label="Cidade"><input style={inp} value={f.cidade} disabled={!pode} onChange={(e) => set('cidade', e.target.value)} /></Field>
            <Field label="UF"><input style={inp} maxLength={2} value={f.uf} disabled={!pode} onChange={(e) => set('uf', e.target.value)} /></Field>
          </div>
          {pode ? <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
            : <p style={{ fontSize: 13, color: 'var(--tx3)' }}>Somente proprietário/administrador edita estes dados.</p>}
        </div>
      </div>

      <div className="ga-card" style={{ marginTop: 16 }}>
        <b>Código de parceria</b>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, background: 'var(--bg2)', border: '1px dashed var(--line2)', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: 'var(--brand)' }}>{org?.slug}</code>
          <BtnSm onClick={() => { navigator.clipboard?.writeText(org?.slug ?? ''); toast('Código copiado.') }}>Copiar</BtnSm>
        </div>
      </div>

      {podeFin && <GatewayPagamento />}

      <div className="ga-card" style={{ marginTop: 16 }}>
        <b>Sobre</b>
        <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 6 }}>Gestor Arena v{APP_VERSION} · um produto <b>VIZIO</b> / INPERSON.</p>
      </div>
    </div>
  )
}

function GatewayPagamento() {
  const toast = useToast()
  const [st, setSt] = useState<'loading' | 'on' | 'off' | 'err'>('loading')
  const [env, setEnv] = useState('')
  const webhook = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`
  useEffect(() => {
    let vivo = true
    void sb.functions.invoke('asaas-status', { body: {} }).then(({ data, error }) => {
      if (!vivo) return
      if (error) return setSt('err')
      const d = data as { configured?: boolean; env?: string }
      setEnv(d?.env ?? ''); setSt(d?.configured ? 'on' : 'off')
    })
    return () => { vivo = false }
  }, [])
  return (
    <div className="ga-card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <b>Gateway de pagamento (Asaas)</b>
        {st === 'loading' && <span className="ga-chip ga-chip-muted">verificando…</span>}
        {st === 'on' && <span className="ga-chip ga-chip-ok">Ativo · {env}</span>}
        {st === 'off' && <span className="ga-chip ga-chip-warn">Pendente de configuração</span>}
        {st === 'err' && <span className="ga-chip ga-chip-muted">Indisponível</span>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '8px 0 0' }}>Boleto e PIX das cobranças. Já está construído — falta ligar as chaves. Enquanto isso, use a baixa manual no Financeiro.</p>
      <div style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '12px 0 6px' }}>URL do webhook (cadastrar no painel Asaas)</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code style={{ flex: 1, minWidth: 0, background: 'var(--bg2)', border: '1px dashed var(--line2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{webhook}</code>
        <BtnSm onClick={() => { navigator.clipboard?.writeText(webhook); toast('URL copiada.') }}>Copiar</BtnSm>
      </div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '12px 0 6px' }}>Para ligar</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--tx2)', display: 'grid', gap: 4 }}>
        <li>Criar conta Asaas (CNPJ) e obter a API Key</li>
        <li>Secrets no Supabase: <b>ASAAS_API_KEY</b>, <b>ASAAS_WEBHOOK_TOKEN</b>, <b>ASAAS_ENV</b>=producao</li>
        <li>Cadastrar a URL acima no Asaas com o mesmo token (eventos de pagamento)</li>
        <li>Preencher CPF/CNPJ dos clientes/alunos</li>
      </ul>
    </div>
  )
}
