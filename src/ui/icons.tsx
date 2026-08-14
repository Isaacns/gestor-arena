// Ícones line do mockup oficial — traço fino, cantos redondos, herdam currentColor.
import type { ReactElement } from 'react'
type P = { size?: number }
const S = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })

export const Icons: Record<string, (p: P) => ReactElement> = {
  home: ({ size = 20 }) => <svg {...S(size)}><path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /><path d="M9.5 20v-5h5v5" /></svg>,
  calendar: ({ size = 20 }) => <svg {...S(size)}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m8.5 15 2 2 3.5-4" /></svg>,
  pin: ({ size = 20 }) => <svg {...S(size)}><path d="M12 22s7-6 7-12A7 7 0 0 0 5 10c0 6 7 12 7 12Z" /><circle cx="12" cy="10" r="2.6" /></svg>,
  grid: ({ size = 20 }) => <svg {...S(size)}><rect x="4" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" /></svg>,
  link: ({ size = 20 }) => <svg {...S(size)}><path d="M10.5 13.5a3.5 3.5 0 0 1 0-5l2-2a3.5 3.5 0 0 1 5 5l-1.2 1.2" /><path d="M13.5 10.5a3.5 3.5 0 0 1 0 5l-2 2a3.5 3.5 0 0 1-5-5l1.2-1.2" /></svg>,
  users: ({ size = 20 }) => <svg {...S(size)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3 2.5-5.4 5.5-5.4s5.5 2.4 5.5 5.4" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 20c0-2.6-1.2-4.7-3-5.4" /></svg>,
  user: ({ size = 20 }) => <svg {...S(size)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6.4 8-6.4s8 2.4 8 6.4" /></svg>,
  dollar: ({ size = 20 }) => <svg {...S(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7.2v9.6" /><path d="M14.8 9.6c0-1.3-1.2-2-2.8-2s-2.8.7-2.8 1.9 1.2 1.8 2.8 2.1 2.8.8 2.8 2-1.2 2-2.8 2-2.8-.7-2.8-2" /></svg>,
  box: ({ size = 20 }) => <svg {...S(size)}><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7Z" /><path d="M3.7 7.1 12 12l8.3-4.9M12 12v9.5" /></svg>,
  wrench: ({ size = 20 }) => <svg {...S(size)}><path d="M15 6.5a4 4 0 0 0-5.3 5.2l-5.4 5.4a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4A4 4 0 0 0 17 8.5l-2.3 2.3-2.2-.6-.6-2.2z" /></svg>,
  chart: ({ size = 20 }) => <svg {...S(size)}><path d="M4 20h16" /><path d="M7 20v-5M12 20v-9M17 20v-4" /></svg>,
  gear: ({ size = 20 }) => <svg {...S(size)}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-1.8-1L14.9 3h-3.8l-.4 2.6a7.7 7.7 0 0 0-1.8 1l-2.3-1-2 3.4L4.6 11a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 1.8 1l.4 2.6h3.8l.4-2.6a7.7 7.7 0 0 0 1.8-1l2.3 1 2-3.4z" /></svg>,
  cap: ({ size = 20 }) => <svg {...S(size)}><path d="M2 8.5 12 4l10 4.5-10 4.5z" /><path d="M6 10.5V15c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.5" /><path d="M22 8.5v5" /></svg>,
  roster: ({ size = 20 }) => <svg {...S(size)}><rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 4h6v3H9z" /><path d="M8.5 11h7M8.5 15h7" /></svg>,
  repeat: ({ size = 20 }) => <svg {...S(size)}><path d="M17 3l3 3-3 3" /><path d="M20 6H9a5 5 0 0 0-5 5" /><path d="M7 21l-3-3 3-3" /><path d="M4 18h11a5 5 0 0 0 5-5" /></svg>,
  bell: ({ size = 20 }) => <svg {...S(size)}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10.5 19a1.8 1.8 0 0 0 3 0" /></svg>,
  search: ({ size = 20 }) => <svg {...S(size)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const C = Icons[name]
  return C ? C({ size }) : null
}
