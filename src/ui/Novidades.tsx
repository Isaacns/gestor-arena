import { useEffect, useRef, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { VERSOES_DESC, ordemDe, ORDEM_ATUAL } from '../lib/novidades'
import { Modal } from './kit'

// §19 — Novidades: lista TODAS as versões (recente→antiga) do manifesto `lib/novidades.ts`
// (publica com o deploy — sem INSERT). Abre sozinha quando há versão nova não vista; o
// marcador (até qual ordem o usuário viu) é cross-device em profiles.novidades_visto_ordem.
const fmtData = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}` }

export default function Novidades() {
  const { user } = useAuth()
  const [visto, setVisto] = useState(ORDEM_ATUAL) // otimista: só mostra "novo" após saber o marcador
  const [carregou, setCarregou] = useState(false)
  const [open, setOpen] = useState(false)
  const autoAbriu = useRef(false)

  useEffect(() => {
    if (!user) return
    let vivo = true
    void sb.from('profiles').select('novidades_visto_ordem').eq('id', user.id).single().then(({ data }) => {
      if (!vivo) return
      const v = ((data as { novidades_visto_ordem?: number } | null)?.novidades_visto_ordem) ?? 0
      setVisto(v); setCarregou(true)
      if (!autoAbriu.current && ORDEM_ATUAL > v) { autoAbriu.current = true; setOpen(true) }
    })
    return () => { vivo = false }
  }, [user])

  const temNova = carregou && ORDEM_ATUAL > visto

  function marcarVisto() {
    if (ORDEM_ATUAL > visto) { setVisto(ORDEM_ATUAL); void sb.rpc('marcar_novidades_vistas', { p_ordem: ORDEM_ATUAL }) }
  }
  function fechar() { marcarVisto(); setOpen(false) }

  return (
    <>
      <button type="button" className="ga-iconbtn" onClick={() => setOpen(true)} aria-label={`Novidades${temNova ? ' (novo)' : ''}`} title="Novidades">
        <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>✨</span>{temNova && <span className="dot" />}
      </button>
      {open && (
        <Modal title="Novidades" onClose={fechar}>
          <div style={{ display: 'grid', gap: 18 }}>
            {VERSOES_DESC.map((v, i) => (
              <div key={v.versao} style={{ display: 'grid', gap: 6, animation: 'ga-enter var(--mo-enter) var(--ease-brand) both', animationDelay: `${i * 70}ms` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 15 }}>{v.titulo}</b>
                  <span className="ga-chip ga-chip-info">v{v.versao}</span>
                  {ordemDe(v.versao) > visto && <span className="ga-chip ga-chip-ok">novo</span>}
                  <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 'auto' }}>{fmtData(v.data)}</span>
                </div>
                {v.resumo && <p style={{ fontSize: 13, color: 'var(--tx2)', margin: 0 }}>{v.resumo}</p>}
                <ul style={{ margin: '2px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
                  {v.itens.map((it, j) => <li key={j} style={{ fontSize: 13 }}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="ga-btn" style={{ width: 'auto' }} onClick={fechar}>Entendi</button>
          </div>
        </Modal>
      )}
    </>
  )
}
