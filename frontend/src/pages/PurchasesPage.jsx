import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Download, ArrowRight, Bot, Building2, Layers } from 'lucide-react'
import { purchaseApi, agentProductApi, companyApi } from '@/utils/api'
import { Spinner } from '@/components/ui'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const TABS = [
  { key: 'templates', label: 'Templates', Icon: Layers },
  { key: 'agents',    label: 'Agents',    Icon: Bot },
  { key: 'companies', label: 'Companies', Icon: Building2 },
]

function EmptyState({ label, to }) {
  return (
    <div className="card p-12 text-center">
      <ShoppingBag size={40} className="text-dark-700/20 mx-auto mb-4" />
      <p className="font-semibold text-dark-950 mb-1">No {label} purchases yet</p>
      <p className="text-sm text-dark-700/50 mb-6">Browse {label} and buy ones that fit your needs.</p>
      <Link to={to} className="btn-primary">Browse {label}</Link>
    </div>
  )
}

function TemplatePurchases() {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases', 'me'],
    queryFn: purchaseApi.mine,
  })
  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (purchases.length === 0) return <EmptyState label="templates" to="/templates" />
  return (
    <div className="space-y-3">
      {purchases.map((p) => {
        const t = p.template
        return (
          <div key={p.id} className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-lg shrink-0">
              {t.title[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <Link to={`/templates/${t.slug}`} className="font-semibold text-dark-950 hover:text-primary-500 transition-colors truncate">
                  {t.title}
                </Link>
                <span className="badge badge-green text-xs shrink-0">Owned</span>
              </div>
              <p className="text-xs text-dark-700/50">
                by @{t.author?.username} · {t.category} · {t.agent_count} agent{t.agent_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-dark-700/40 mt-0.5">
                {formatDate(p.purchased_at)} · <span className="font-mono">{p.payment_ref}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-dark-950">{formatPrice(p.amount_paid)}</p>
              <p className="text-xs text-emerald-600 capitalize">{p.status}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {t.zip_url && (
                <a href={`/api/v1/templates/${t.slug}/download`} download
                  className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1" title="Download ZIP">
                  <Download size={13} />
                </a>
              )}
              <Link to={`/templates/${t.slug}`} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1">
                View <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AgentPurchases() {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['agent-purchases', 'me'],
    queryFn: agentProductApi.mine,
  })
  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (purchases.length === 0) return <EmptyState label="agents" to="/agents" />
  return (
    <div className="space-y-3">
      {purchases.map((p) => {
        const a = p.agent_product
        return (
          <div key={p.id} className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <Bot size={22} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <Link to={`/agents/${a.slug}`} className="font-semibold text-dark-950 hover:text-primary-500 transition-colors truncate">
                  {a.name}
                </Link>
                <span className="badge badge-green text-xs shrink-0">Owned</span>
              </div>
              <p className="text-xs text-dark-700/50">
                {a.role} · {a.tier} · {a.model}
              </p>
              <p className="text-xs text-dark-700/40 mt-0.5">
                {formatDate(p.purchased_at)} · <span className="font-mono">{p.payment_ref}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-dark-950">{formatPrice(p.amount_paid)}</p>
              <p className="text-xs text-emerald-600 capitalize">{p.status}</p>
            </div>
            <Link to={`/agents/${a.slug}`} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1 shrink-0">
              View <ArrowRight size={13} />
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function CompanyPurchases() {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['company-purchases', 'me'],
    queryFn: companyApi.mine,
  })
  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (purchases.length === 0) return <EmptyState label="companies" to="/companies" />
  return (
    <div className="space-y-3">
      {purchases.map((p) => {
        const c = p.company_product
        return (
          <div key={p.id} className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <Link to={`/companies/${c.slug}`} className="font-semibold text-dark-950 hover:text-primary-500 transition-colors truncate">
                  {c.name}
                </Link>
                <span className="badge badge-green text-xs shrink-0">Owned</span>
              </div>
              <p className="text-xs text-dark-700/50">
                {c.industry || 'General'} · {c.agent_count} agent{c.agent_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-dark-700/40 mt-0.5">
                {formatDate(p.purchased_at)} · <span className="font-mono">{p.payment_ref}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-dark-950">{formatPrice(p.amount_paid)}</p>
              <p className="text-xs text-emerald-600 capitalize">{p.status}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.zip_url && (
                <a href={`/api/v1/companies/${c.slug}/download`}
                  className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1" title="Download ZIP">
                  <Download size={13} />
                </a>
              )}
              <Link to={`/companies/${c.slug}`} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1">
                View <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PurchasesPage() {
  const [tab, setTab] = useState('templates')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag size={22} className="text-primary-500" />
        <h1 className="font-display font-bold text-2xl text-dark-950">My Purchases</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-surface-border">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-dark-700/60 hover:text-dark-800'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates' && <TemplatePurchases />}
      {tab === 'agents'    && <AgentPurchases />}
      {tab === 'companies' && <CompanyPurchases />}
    </div>
  )
}
