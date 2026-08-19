import { useEffect, useRef, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Modal } from './kit'

// §19 — Novidades: mostra TODAS as versões públicas (recente→antiga, por `ordem` desc,
// sem limit). Abre sozinha quando há versão nova não vista (marcador cross-device no perfil).
type Versao = { id: string; versao: string; ordem: number; titulo: string; resumo: string | null; itens: string[]; data: string }
const fmtData = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}` }

export default function Novidades() {
  const { user } = useAuth()
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [visto, setVisto] = useState(0)
  const [open, setOpen] = useState(false)
  const autoAbriu = useRef(false)

  useEffect(() => {
    if (!user) return
    let vivo = true
    ;(async () => {
      const [v, p] = await Promise.all([
        sb.from('plataforma_versoes').select('*').order('ordem', { ascending: false }),
        sb.from('profiles').select('novidades_visto_ordem').eq('id', user.id).single(),
      ])
      if (!vivo) return
      const lista = (v.data as Versao[]) ?? []
      const vistoOrdem = ((p.data as { novidades_visto_ordem?: number } | null)?.novidades_visto_ordem) ?? 0
      setVersoes(lista); setVisto(vistoOrdem)
      const maxOrdem = lista[0]?.ordem ?? 0
      if (!autoAbriu.current && maxOrdem > vistoOrdem) { autoAbriu.current = true; setOpen(true) }
    })()
    return () => { vivo = false }
  }, [user])

  const maxOrdem = versoes[0]?.ordem ?? 0
  const temNova = maxOrdem > visto

  function marcarVisto() {
    if (maxOrdem > visto) { setVisto(maxOrdem); void sb.rpc('marcar_novidades_vistas', { p_ordem: maxOrdem }) }
  }
  function fechar() { marcarVisto(); setOpen(false) }

  return (
    <>
      <button type="button" className="ga-iconbtn" onClick={() => setOpen(true)} aria-label={`Novidades${temNova ? ' (novo)' : ''}`} title="Novidades">
        <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>✨</span>{temNova && <span className="dot" />}
      </button>
      {open && (
        <Modal title="Novidades" onClose={fechar}>
          {versoes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--tx2)' }}>Nada por aqui ainda.</p>
          ) : (
            <div style={{ display: 'grid', gap: 18 }}>
              {versoes.map((v, i) => (
                <div key={v.id} style={{ display: 'grid', gap: 6, animation: 'ga-enter var(--mo-enter) var(--ease-brand) both', animationDelay: `${i * 70}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15 }}>{v.titulo}</b>
                    <span className="ga-chip ga-chip-info">v{v.versao}</span>
                    {v.ordem > visto && <span className="ga-chip ga-chip-ok">novo</span>}
                    <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 'auto' }}>{fmtData(v.data)}</span>
                  </div>
                  {v.resumo && <p style={{ fontSize: 13, color: 'var(--tx2)', margin: 0 }}>{v.resumo}</p>}
                  <ul style={{ margin: '2px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
                    {v.itens.map((it, j) => <li key={j} style={{ fontSize: 13 }}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="ga-btn" style={{ width: 'auto' }} onClick={fechar}>Entendi</button>
          </div>
        </Modal>
      )}
    </>
  )
}
