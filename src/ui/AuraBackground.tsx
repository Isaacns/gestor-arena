import { useEffect } from 'react'

// Carrega o MODO AURA v3 (perfil Constelação) uma vez, com o acento do Gestor Arena.
export function AuraBackground({ accent = '#1769FF' }: { accent?: string }) {
  useEffect(() => {
    ;(window as unknown as { VZ_ACCENT?: string }).VZ_ACCENT = accent
    if ((window as unknown as { __AURA_INIT__?: boolean }).__AURA_INIT__) return
    const s = document.createElement('script')
    s.src = '/aura.js'; s.async = true
    document.body.appendChild(s)
  }, [accent])
  return null
}
