import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bot, ShoppingCart, CheckCircle2, Tag, User, Cpu, Layers } from 'lucide-react'
import { agentProductApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import clsx from 'clsx'

const TIER_COLORS = {
  Leadership: 'bg-violet-50 text-violet-700 border border-violet-200',
  Operations: 'bg-amber-50 text-amber-700 border border-amber-200',
  Execution: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function AgentProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', slug],
    queryFn: () => agentProductApi.get(slug),
  })

  const { data: purchaseInfo } = useQuery({
    queryKey: ['agent-purchase-check', slug],
    queryFn: () => agentProductApi.check(slug),
    enabled: !!user && !!agent?.price && agent.price > 0,
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner size={28} /></div>
  if (!agent) return <div className="text-center py-32 text-dark-700/50">Agent not found.</div>

  const isPaid = agent.price > 0
  const isOwner = user && String(agent.author?.id) === String(user.id)
  const isAdmin = user && ['admin', 'super_admin'].includes(user.role)
  const hasPurchased = purchaseInfo?.purchased
  const hasAccess = !isPaid || isOwner || isAdmin || hasPurchased

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-dark-700/60 hover:text-primary-500 mb-8">
        <ArrowLeft size={15} /> Back to Agents
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Bot size={28} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-display font-bold text-2xl text-dark-950 leading-tight">{agent.name}</h1>
                  {isPaid && hasPurchased && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={11} /> Purchased
                    </span>
                  )}
                  {isOwner && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                      Your listing
                    </span>
                  )}
                </div>
                <p className="text-dark-700/60 text-sm">{agent.role}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', TIER_COLORS[agent.tier] || TIER_COLORS.Execution)}>
                    {agent.tier}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-dark-700/60 border border-surface-border font-mono">
                    {agent.model}
                  </span>
                  {!isPaid && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200">
                      Free
                    </span>
                  )}
                </div>
              </div>
            </div>

            {agent.description && (
              <p className="mt-4 text-dark-700/80 leading-relaxed">{agent.description}</p>
            )}
          </div>

          {/* Instructions */}
          {agent.instructions && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-base text-dark-950 mb-3 flex items-center gap-2">
                <Cpu size={16} className="text-primary-500" /> System Instructions
              </h2>
              {hasAccess ? (
                <pre className="text-sm text-dark-700/80 bg-surface-muted rounded-lg p-4 whitespace-pre-wrap leading-relaxed font-mono">
                  {agent.instructions}
                </pre>
              ) : (
                <div className="text-sm text-dark-700/50 bg-surface-muted rounded-lg p-4 text-center">
                  Purchase to view full instructions
                </div>
              )}
            </div>
          )}

          {/* Responsibilities */}
          {agent.responsibilities?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-base text-dark-950 mb-3 flex items-center gap-2">
                <Layers size={16} className="text-primary-500" /> Responsibilities
              </h2>
              <ul className="space-y-2">
                {agent.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-dark-700/80">
                    <span className="text-primary-500 mt-0.5 shrink-0">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {agent.tags?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-dark-700/50" />
                <span className="text-sm font-medium text-dark-700/60">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.tags.map(t => (
                  <span key={t} className="text-xs text-dark-700/60 bg-surface-muted rounded-full px-3 py-1">#{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pricing / buy */}
          <div className="card p-5 sticky top-6">
            {isPaid && !hasAccess ? (
              <>
                <div className="text-center mb-4">
                  <p className="text-3xl font-display font-bold text-dark-950">{formatPrice(agent.price)}</p>
                  <p className="text-xs text-dark-700/50 mt-0.5">One-time purchase</p>
                </div>
                {user ? (
                  <button
                    onClick={() => navigate(`/agents/checkout/${slug}`)}
                    className="btn-primary w-full justify-center py-3 gap-2"
                  >
                    <ShoppingCart size={16} /> Buy Now · {formatPrice(agent.price)}
                  </button>
                ) : (
                  <Link to="/login" className="btn-primary w-full justify-center py-3 block text-center">
                    Log in to purchase
                  </Link>
                )}
                <ul className="mt-4 space-y-1.5 text-xs text-dark-700/50">
                  <li>✓ Lifetime access</li>
                  <li>✓ Full system instructions</li>
                  <li>✓ Responsibilities breakdown</li>
                </ul>
              </>
            ) : isPaid && hasAccess ? (
              <div className="text-center py-2">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-dark-950 text-sm">
                  {isOwner ? 'Your listing' : 'You own this agent'}
                </p>
                <p className="text-xs text-dark-700/50 mt-1">Full access granted</p>
              </div>
            ) : (
              <div className="text-center py-2">
                <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-semibold border border-primary-200 mb-2">Free</span>
                <p className="text-xs text-dark-700/50">No purchase required</p>
              </div>
            )}
          </div>

          {/* Author */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-dark-700/50 uppercase tracking-wider mb-3">Author</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {agent.author?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-dark-900 text-sm">@{agent.author?.username}</p>
                {agent.author?.full_name && <p className="text-xs text-dark-700/50">{agent.author.full_name}</p>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-dark-700/50 uppercase tracking-wider mb-3">Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-700/60">Views</span>
                <span className="font-medium text-dark-900">{agent.view_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-700/60">Purchases</span>
                <span className="font-medium text-dark-900">{agent.purchase_count ?? 0}</span>
              </div>
            </div>
          </div>

          {isOwner && (
            <Link
              to={`/agents/${slug}/edit`}
              className="btn-outline w-full justify-center block text-center"
            >
              Edit listing
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
