import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, GitFork, Zap, Shield, Users,
  Bot, Building2, ShoppingCart, Check, Layers,
} from 'lucide-react'
import { templateApi, agentProductApi } from '@/utils/api'
import TemplateCard from '@/components/templates/TemplateCard'
import { Spinner } from '@/components/ui'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const FEATURES = [
  {
    icon: Layers,
    title: 'AI Template packs',
    desc: 'Complete multi-agent company setups — fork, configure, and deploy in minutes.',
    color: 'text-primary-500 bg-primary-50',
    to: '/templates',
  },
  {
    icon: Bot,
    title: 'Standalone agents',
    desc: 'Buy individual AI agents — Leadership, Operations, or Execution tier.',
    color: 'text-violet-600 bg-violet-50',
    to: '/agents',
  },
  {
    icon: Building2,
    title: 'Company AI setups',
    desc: 'Full company AI org charts with coordinated agent teams, ready to go.',
    color: 'text-blue-600 bg-blue-50',
    to: '/companies',
  },
  {
    icon: Shield,
    title: 'Community curated',
    desc: 'Every listing is reviewed and rated by real builders running AI businesses.',
    color: 'text-emerald-600 bg-emerald-50',
    to: null,
  },
]

const TIER_COLORS = {
  Leadership: 'bg-violet-50 text-violet-700 border border-violet-200',
  Operations: 'bg-amber-50 text-amber-700 border border-amber-200',
  Execution: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

function formatPrice(cents) {
  if (!cents || cents <= 0) return null
  return `$${(cents / 100).toFixed(2)}`
}

function FeaturedAgentCard({ agent }) {
  const { user } = useAuthStore()
  const { addItem, hasItem } = useCartStore()
  const isPaid = agent.price > 0
  const price = formatPrice(agent.price)
  const inCart = isPaid && hasItem(agent.id)

  function handleCart(e) {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id: agent.id, type: 'agent', slug: agent.slug, name: agent.name, price: agent.price })
  }

  return (
    <Link to={`/agents/${agent.slug}`} className="card block group overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1.5 bg-gradient-to-r from-violet-500 to-primary-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Bot size={18} className="text-violet-600" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
        <p className="text-xs text-dark-700/50 mb-2">{agent.role}</p>

        {agent.description && (
          <p className="text-sm text-dark-700/70 line-clamp-2 mb-3">{agent.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-dark-700/50 border-t border-surface-border pt-3">
          <span>by @{agent.author?.username}</span>
          {isPaid && user && (
            <button
              onClick={handleCart}
              title={inCart ? 'In cart' : 'Add to cart'}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                inCart
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-surface-muted hover:bg-violet-50 hover:text-violet-600 text-dark-700/50'
              )}
            >
              {inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { data: templatesData, isLoading: tLoading } = useQuery({
    queryKey: ['templates', 'home'],
    queryFn: () => templateApi.list({ page: 1, size: 6, sort_by: 'fork_count' }),
  })

  const { data: agents = [], isLoading: aLoading } = useQuery({
    queryKey: ['agents', 'home'],
    queryFn: () => agentProductApi.list({ limit: 6 }),
  })

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-primary-900 text-white">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6 border border-white/10">
            <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
            AI marketplace for the agentic ecosystem
          </div>

          <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-6">
            Buy AI Agents.{' '}
            <span className="text-accent-400 italic">Deploy in minutes.</span>
          </h1>

          <p className="text-white/60 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Browse templates, standalone agents, and full company AI setups.
            Add to cart, checkout, and launch your agentic stack today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/templates" className="btn-accent px-6 py-3 text-base font-semibold shadow-lg">
              Browse templates <ArrowRight size={17} />
            </Link>
            <Link to="/agents" className="btn px-6 py-3 text-base bg-white/10 text-white border border-white/20 hover:bg-white/20 flex items-center gap-2">
              <Bot size={16} /> Explore agents
            </Link>
            <Link to="/companies" className="btn px-6 py-3 text-base bg-white/10 text-white border border-white/20 hover:bg-white/20 flex items-center gap-2">
              <Building2 size={16} /> Company setups
            </Link>
          </div>

          <p className="text-white/30 text-sm mt-8">
            Works with Paperclip · OpenClaw · Any agent runtime
          </p>
        </div>
      </section>

      {/* ── What's on the marketplace ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10">
          <p className="text-accent-500 font-semibold text-sm uppercase tracking-wider mb-1">Marketplace</p>
          <h2 className="section-title">Everything you need to go agentic</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            f.to ? (
              <Link key={f.title} to={f.to} className="card p-6 group hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-display font-semibold text-dark-950 mb-1.5 group-hover:text-primary-600 transition-colors">{f.title}</h3>
                <p className="text-sm text-dark-700/60 leading-relaxed">{f.desc}</p>
                <span className="text-xs text-primary-500 font-medium mt-3 inline-flex items-center gap-1">
                  Browse <ArrowRight size={11} />
                </span>
              </Link>
            ) : (
              <div key={f.title} className="card p-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-display font-semibold text-dark-950 mb-1.5">{f.title}</h3>
                <p className="text-sm text-dark-700/60 leading-relaxed">{f.desc}</p>
              </div>
            )
          ))}
        </div>
      </section>

      {/* ── Featured Templates ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-accent-500 font-semibold text-sm uppercase tracking-wider mb-1">Most forked</p>
            <h2 className="section-title">Top Templates</h2>
          </div>
          <Link to="/templates" className="btn-outline text-sm">View all →</Link>
        </div>

        {tLoading ? (
          <div className="flex justify-center py-16"><Spinner size={28} /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {templatesData?.items?.map((t) => <TemplateCard key={t.id} template={t} />)}
          </div>
        )}
      </section>

      {/* ── Featured Agents ────────────────────────────────────── */}
      {(aLoading || agents.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-violet-500 font-semibold text-sm uppercase tracking-wider mb-1 flex items-center gap-1">
                <Bot size={13} /> Agents marketplace
              </p>
              <h2 className="section-title">Featured Agents</h2>
            </div>
            <Link to="/agents" className="btn-outline text-sm">View all →</Link>
          </div>

          {aLoading ? (
            <div className="flex justify-center py-16"><Spinner size={28} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.slice(0, 6).map((a) => <FeaturedAgentCard key={a.id} agent={a} />)}
            </div>
          )}
        </section>
      )}

      {/* ── CTA banner ────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-primary-500 to-violet-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="font-display font-bold text-3xl mb-3">Built something agentic?</h2>
          <p className="text-white/75 mb-8 text-lg">
            Share templates, agents, or company setups with thousands of builders — and earn from every sale.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/submit" className="btn bg-white text-primary-600 hover:bg-primary-50 px-6 py-3 font-semibold text-base">
              Submit a template
            </Link>
            <Link to="/agents/submit" className="btn bg-white/10 text-white border border-white/30 hover:bg-white/20 px-6 py-3 font-semibold text-base flex items-center gap-2">
              <Bot size={16} /> List an agent
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
