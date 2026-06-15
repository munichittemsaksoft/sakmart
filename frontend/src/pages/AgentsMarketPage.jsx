import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot, Search, Plus, Users, ShoppingCart, Check } from 'lucide-react'
import { agentProductApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { Spinner } from '@/components/ui'
import clsx from 'clsx'

const TIERS = ['Leadership', 'Operations', 'Execution']

const TIER_COLORS = {
  Leadership: 'bg-violet-50 text-violet-700 border border-violet-200',
  Operations: 'bg-amber-50 text-amber-700 border border-amber-200',
  Execution: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

function formatPrice(cents) {
  if (!cents || cents <= 0) return null
  return `$${(cents / 100).toFixed(2)}`
}

function AgentCard({ agent }) {
  const { user } = useAuthStore()
  const { addItem, hasItem } = useCartStore()
  const isPaid = agent.price > 0
  const price = formatPrice(agent.price)
  const inCart = isPaid && hasItem(agent.id)

  function handleAddToCart(e) {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id: agent.id, type: 'agent', slug: agent.slug, name: agent.name, price: agent.price })
  }

  return (
    <Link to={`/agents/${agent.slug}`} className="card block group overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1.5 bg-gradient-to-r from-violet-500 to-primary-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Bot size={20} className="text-violet-600" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {price ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {price}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200">
                Free
              </span>
            )}
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', TIER_COLORS[agent.tier] || TIER_COLORS.Execution)}>
              {agent.tier}
            </span>
          </div>
        </div>

        <h3 className="font-display font-semibold text-dark-950 text-base leading-snug mb-0.5 group-hover:text-primary-600 transition-colors line-clamp-1">
          {agent.name}
        </h3>
        <p className="text-xs text-dark-700/50 mb-2">{agent.role} · {agent.model}</p>

        {agent.description && (
          <p className="text-sm text-dark-700/70 leading-relaxed line-clamp-2 mb-3">{agent.description}</p>
        )}

        {agent.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {agent.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs text-dark-700/60 bg-surface-muted rounded px-2 py-0.5">#{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-dark-700/50 border-t border-surface-border pt-3">
          <span>by @{agent.author?.username}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><Users size={11} /> {agent.purchase_count}</span>
            {isPaid && user && (
              <button
                onClick={handleAddToCart}
                title={inCart ? 'In cart' : 'Add to cart'}
                className={clsx(
                  'p-1.5 rounded-lg transition-colors',
                  inCart
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-surface-muted text-dark-700/50 hover:bg-violet-50 hover:text-violet-600'
                )}
              >
                {inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function AgentsMarketPage() {
  const { user } = useAuthStore()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const [search, setSearch] = useState('')

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', search, tier],
    queryFn: () => agentProductApi.list({ q: search || undefined, tier: tier || undefined }),
  })

  function handleSearch(e) {
    e.preventDefault()
    setSearch(q)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={24} className="text-violet-500" />
          <span className="text-sm font-semibold text-violet-600 uppercase tracking-wider">Marketplace</span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-3xl text-dark-950">AI Agents</h1>
            <p className="text-dark-700/60 mt-1">Browse and deploy individual AI agents built by the community</p>
          </div>
          {user && (
            <Link to="/agents/submit" className="btn-accent flex items-center gap-2 text-sm px-4 py-2">
              <Plus size={15} /> List an Agent
            </Link>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-700/40" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search agents…"
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn-primary px-5">Search</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTier('')}
            className={clsx('text-xs px-3 py-1.5 rounded-lg border transition-colors', tier === '' ? 'bg-primary-500 text-white border-primary-500' : 'border-surface-border text-dark-700 hover:bg-surface-muted')}
          >
            All
          </button>
          {TIERS.map(t => (
            <button
              key={t}
              onClick={() => setTier(tier === t ? '' : t)}
              className={clsx('text-xs px-3 py-1.5 rounded-lg border transition-colors', tier === t ? 'bg-violet-500 text-white border-violet-500' : 'border-surface-border text-dark-700 hover:bg-surface-muted')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 card p-12">
          <Bot size={40} className="text-dark-700/20 mx-auto mb-4" />
          <p className="font-semibold text-dark-950 mb-1">No agents found</p>
          <p className="text-sm text-dark-700/50 mb-5">
            {search || tier ? 'Try different filters.' : 'Be the first to list an AI agent.'}
          </p>
          {user && (
            <Link to="/agents/submit" className="btn-primary">List an Agent</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map(a => <AgentCard key={a.id} agent={a} />)}
        </div>
      )}
    </div>
  )
}
