import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, Field, Foot, Modal, errMsg, inp, useToast } from '../ui/kit'

// Cria uma organização ADICIONAL para o usuário (ex.: já tem Escola, quer também Arena).
export default function NovaOrg({ onClose }: { onClose: () => void }) {
  const { orgs, reload, setOrg } = useAuth()
  const toast = useToast()
  const jaTem = new Set(orgs.map((o) => o.org.tipo))
  const sugestao = jaTem.has('arena') && !jaTem.has('escola') ? 'escola' : 'arena'
  const [tipo, setTipo] = useState<'arena' | 'escola'>(sugestao as 'arena' | 'escola')
  const [nome, setNome] = useState('')
  const [busy, setBusy] = useState(false)

  async function criar() {
    if (!nome.trim()) return toast('Informe o nome.', true)
    setBusy(true)
    const { data, error } = await sb.rpc('criar_organizacao', { p_tipo: tipo, p_nome: nome.trim() })
    if (error) { toast(errMsg(error), true); setBusy(false); return }
    await reload()
    const nova = (data as { id?: string } | null)?.id
    if (nova) setOrg(nova)
    toast(`${tipo === 'arena' ? 'Arena' : 'Escolinha'} criada! Você já está nela.`)
    onClose()
  }

  return (
    <Modal title="Nova organização" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: -4, marginBottom: 14 }}>
        Você pode ter uma Arena e uma escolinha na mesma conta e alternar entre elas.
      </p>
      <Field label="Tipo">
        <div style={{ display: 'grid', gap: 10 }}>
          {(['arena', 'escola'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)} style={{
              textAlign: 'left', background: 'var(--bg2)', borderRadius: 12, padding: 14, cursor: 'pointer',
              border: '1px solid ' + (tipo === t ? 'var(--brand)' : 'var(--line2)'),
            }}>
              <b>{t === 'arena' ? '🏟️ Arena' : '🎓 Escolinha / projeto'}</b>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginTop: 2 }}>
                {t === 'arena' ? 'Quadras, agenda, parceiros e financeiro do espaço.' : 'Alunos, turmas, professores, presença e mensalidades.'}
              </span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Nome"><input style={inp} placeholder={tipo === 'arena' ? 'Ex.: Arena Beach Sports' : 'Ex.: Escolinha João Futvôlei'} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="ga-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void criar()}>{busy ? 'Criando…' : 'Criar'}</button>
      </Foot>
    </Modal>
  )
}
