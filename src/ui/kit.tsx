import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode, type CSSProperties } from 'react'

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
          <div key={t.id} role={t.err ? 'alert' : 'status'} style={{
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

// Exporta linhas como CSV (separador ; para o Excel BR, com BOM para acentos).
export function baixarCSV(nome: string, linhas: (string | number | null)[][]) {
  const esc = (v: string | number | null) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = linhas.map((l) => l.map(esc).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Modal ---------- */
// pilha global: com modais aninhados (ex.: Gerir turma → Chamada) só o do topo trata Escape/Tab
const modalStack: symbol[] = []
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const meuId = Symbol('modal')
    modalStack.push(meuId)   // ordem do stack = ordem de montagem (empilha por cima)
    const anterior = document.activeElement as HTMLElement | null
    const el = ref.current
    el?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    function onKey(e: KeyboardEvent) {
      if (modalStack[modalStack.length - 1] !== meuId) return   // só o topo responde
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key === 'Tab' && el) {
        const f = el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const i = modalStack.indexOf(meuId); if (i >= 0) modalStack.splice(i, 1)
      anterior?.focus?.()
    }
  }, [])
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,28,54,.45)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 18 }}>
      <div ref={ref} role="dialog" aria-modal aria-labelledby={titleId} className="ga-glass" style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', padding: 24, boxShadow: 'var(--card-shadow)' }}>
        <h3 id={titleId} style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>{title}</h3>
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

/* Campo de senha com botão mostrar/ocultar (padrão VIZIO — todo campo de senha tem). */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input {...props} type={show ? 'text' : 'password'} style={{ ...inp, paddingRight: 40, ...props.style }} />
      <button type="button" onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} title={show ? 'Ocultar senha' : 'Mostrar senha'}
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 16, lineHeight: 1, padding: 4 }}>
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

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
export function Loading() { return <div style={{ padding: 36, textAlign: 'center', color: 'var(--tx2)', fontSize: 13 }}>Carregando…</div> }
export function ErroCarregar({ onRetry, texto }: { onRetry: () => void; texto?: string }) {
  return <div style={{ textAlign: 'center', padding: 32 }}>
    <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden>⚠️</div>
    <b style={{ display: 'block', marginBottom: 4 }}>Não foi possível carregar</b>
    <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 auto 14px', maxWidth: 340 }}>{texto ?? 'Verifique sua conexão e tente novamente.'}</p>
    <BtnSm onClick={onRetry}>Tentar novamente</BtnSm>
  </div>
}
