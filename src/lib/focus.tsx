import { createContext, useContext, useEffect } from 'react'

// Foco pendente: ao navegar via busca, a tela-alvo abre a ficha do item.
export type Foco = { view: string; id: string } | null
export const FocusCtx = createContext<{ foco: Foco; limpar: () => void }>({ foco: null, limpar: () => {} })

// Chame na tela: quando o foco aponta para ela e o item já carregou, abre a ficha.
export function useAbrirFicha<T extends { id: string }>(view: string, rows: T[], abrir: (row: T) => void) {
  const { foco, limpar } = useContext(FocusCtx)
  useEffect(() => {
    if (foco?.view === view && foco.id) {
      const row = rows.find((r) => r.id === foco.id)
      if (row) { abrir(row); limpar() }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco, rows])
}
