import { createContext, useCallback, useContext, useState, type ReactNode, type CSSProperties } from 'react'

/* ---------- Toast ---------- */
type Toast = { id: number; msg: string; err?: boolean }
const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {})
export function useToast() { return useContext(ToastCtx) }
export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((msg: string, err?: boolean) => {
    const id = performance.now()
    setItems((s) => [...s, { id, msg, err }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), err ? 6000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 90, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        {items.map((t) => (
          <div key={t.id} role="status" style={{
            background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 12,
            padding: '11px 14px 11px 34px', fontSize: 13, position: 'relative', boxShadow: 'var(--card-shadow)',
          }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: t.err ? 'var(--danger)' : 'var(--ok)', fontWeight: 700 }}>{t.err ? '!' : '✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export function errMsg(e: unknown): string {
  const m = (e as { message?: string })?.message
  return m || 'Algo deu errado. Tente novamente.'
}

/* ---------- Modal ---------- */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,28,54,.45)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 18 }}>
      <div role="dialog" aria-modal style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', padding: 24, boxShadow: 'var(--card-shadow)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}
export function Foot({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>{children}</div>
}

/* ---------- Field / inputs ---------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      {children}
    </label>
  )
}
export const inp: CSSProperties = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--line2)', color: 'var(--tx)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }

/* ---------- Badge / botões ---------- */
export function Badge({ children, color }: { children: ReactNode; color: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color, background: color + '1F' }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{children}
  </span>
}
export function BtnGhost(p: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--tx)', fontWeight: 600, fontSize: 14, cursor: 'pointer', ...p.style }} />
}
export function BtnSm(p: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  const { danger, ...rest } = p
  return <button {...rest} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card2)', color: danger ? 'var(--danger)' : 'var(--tx)', fontWeight: 600, fontSize: 13, cursor: 'pointer', ...rest.style }} />
}

/* ---------- estados ---------- */
export function Empty({ ico, titulo, texto, children }: { ico: string; titulo: string; texto: string; children?: ReactNode }) {
  return <div style={{ textAlign: 'center', padding: 40 }}>
    <div style={{ fontSize: 30, marginBottom: 10 }}>{ico}</div>
    <b style={{ display: 'block', marginBottom: 4 }}>{titulo}</b>
    <p style={{ fontSize: 13, color: 'var(--tx2)', maxWidth: 380, margin: '0 auto 16px' }}>{texto}</p>
    {children}
  </div>
}
export function Loading() { return <div style={{ padding: 36, textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>Carregando…</div> }
