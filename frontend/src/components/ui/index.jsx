// Barrel of small UI primitives

import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

// ── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 20, className }) {
  return <Loader2 size={size} className={clsx('animate-spin text-primary-500', className)} />
}

// ── Empty state ──────────────────────────────────────────────
export function Empty({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center mb-4">
          <Icon size={24} className="text-dark-700/40" />
        </div>
      )}
      <h3 className="font-display font-semibold text-dark-950 text-lg mb-1">{title}</h3>
      {message && <p className="text-sm text-dark-700/60 max-w-xs mb-4">{message}</p>}
      {action}
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────
export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        {eyebrow && (
          <p className="text-accent-500 font-semibold text-sm uppercase tracking-wider mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display font-bold text-3xl text-dark-950 tracking-tight">{title}</h1>
        {subtitle && <p className="text-dark-700/60 mt-1.5 text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, value, onChange, options, className }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  const range = Array.from({ length: pages }, (_, i) => i + 1)
  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="btn-ghost px-3 py-2 text-sm disabled:opacity-40"
      >
        Prev
      </button>
      {range.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={clsx(
            'w-9 h-9 rounded text-sm font-medium transition-colors',
            p === page
              ? 'bg-primary-500 text-white'
              : 'text-dark-700 hover:bg-surface-muted'
          )}
        >
          {p}
        </button>
      ))}
      <button
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
        className="btn-ghost px-3 py-2 text-sm disabled:opacity-40"
      >
        Next
      </button>
    </div>
  )
}

// ── Category pill filter ──────────────────────────────────────
export function CategoryFilter({ value, onChange }) {
  const categories = [
    { label: 'All', value: '' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'SaaS', value: 'SaaS' },
    { label: 'E-commerce', value: 'E-commerce' },
    { label: 'Agency', value: 'Agency' },
    { label: 'Media', value: 'Media' },
    { label: 'Finance', value: 'Finance' },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          className={clsx(
            'text-sm font-medium px-4 py-1.5 rounded-full border transition-all',
            value === c.value
              ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
              : 'bg-white text-dark-700 border-surface-border hover:border-primary-300 hover:text-primary-600'
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
