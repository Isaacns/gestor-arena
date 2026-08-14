import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnSm, Field, errMsg, inp, useToast } from '../ui/kit'

const APP_VERSION = '0.3.0'

export default function Config() {
  const { org, role, reload } = useAuth()
  const toast = useToast()
  const pode = ['owner', 'admin'].includes(role ?? '')
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

      <div className="ga-card" style={{ marginTop: 16 }}>
        <b>Sobre</b>
        <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 6 }}>Gestor Arena v{APP_VERSION} · um produto <b>VIZIO</b> / INPERSON.</p>
      </div>
    </div>
  )
}
