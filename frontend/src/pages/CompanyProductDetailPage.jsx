import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, ShoppingCart, CheckCircle2, Tag,
  Users, Download, Bot, ChevronRight, Target, Heart, Check,
} from 'lucide-react'
import { companyApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
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

export default function CompanyProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addItem, hasItem } = useCartStore()

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => companyApi.get(slug),
  })

  const { data: purchaseInfo } = useQuery({
    queryKey: ['company-purchase-check', slug],
    queryFn: () => companyApi.check(slug),
    enabled: !!user && !!company?.price && company.price > 0,
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner size={28} /></div>
  if (!company) return <div className="text-center py-32 text-dark-700/50">Company not found.</div>

  const isPaid = company.price > 0
  const isOwner = user && String(company.author?.id) === String(user.id)
  const isAdmin = user && ['admin', 'super_admin'].includes(user.role)
  const hasPurchased = purchaseInfo?.purchased
  const hasAccess = !isPaid || isOwner || isAdmin || hasPurchased

  const downloadUrl = companyApi.downloadUrl(slug)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm text-dark-700/60 hover:text-primary-500 mb-8">
        <ArrowLeft size={15} /> Back to Companies
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 size={28} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-display font-bold text-2xl text-dark-950 leading-tight">{company.name}</h1>
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
                {company.industry && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {company.industry}
                  </span>
                )}
                {!isPaid && (
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200">
                    Free
                  </span>
                )}
              </div>
            </div>
            {company.description && (
              <p className="mt-4 text-dark-700/80 leading-relaxed">{company.description}</p>
            )}
          </div>

          {/* About */}
          {company.long_description && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-base text-dark-950 mb-3">About</h2>
              <p className="text-dark-700/80 leading-relaxed whitespace-pre-wrap">{company.long_description}</p>
            </div>
          )}

          {/* Mission */}
          {company.mission && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-base text-dark-950 mb-3 flex items-center gap-2">
                <Target size={16} className="text-primary-500" /> Mission
              </h2>
              <p className="text-dark-700/80 leading-relaxed italic">{company.mission}</p>
            </div>
          )}

          {/* Values */}
          {company.values?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-base text-dark-950 mb-3 flex items-center gap-2">
                <Heart size={16} className="text-primary-500" /> Values
              </h2>
              <div className="flex flex-wrap gap-2">
                {company.values.map((v, i) => (
                  <span key={i} className="text-sm px-3 py-1 bg-surface-muted rounded-lg text-dark-700/80 border border-surface-border">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Agent Team */}
          {company.agents?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-base text-dark-950 mb-4 flex items-center gap-2">
                <Users size={16} className="text-primary-500" /> Agent Team ({company.agents.length})
              </h2>
              <div className="space-y-3">
                {company.agents
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 bg-surface-muted rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                        <Bot size={15} className="text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm text-dark-950">{a.name}</span>
                          <span className={clsx('text-xs px-1.5 py-0.5 rounded', TIER_COLORS[a.tier] || TIER_COLORS.Execution)}>
                            {a.tier}
                          </span>
                          <span className="text-xs text-dark-700/40 font-mono">{a.model}</span>
                        </div>
                        <p className="text-xs text-dark-700/60 mb-1">{a.role}</p>
                        {a.parent_name && (
                          <p className="text-xs text-dark-700/40 flex items-center gap-1">
                            <ChevronRight size={10} /> Reports to {a.parent_name}
                          </p>
                        )}
                        {a.responsibilities?.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {a.responsibilities.slice(0, 3).map((r, i) => (
                              <li key={i} className="text-xs text-dark-700/60 flex items-start gap-1">
                                <span className="text-primary-400 shrink-0">•</span> {r}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {company.tags?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-dark-700/50" />
                <span className="text-sm font-medium text-dark-700/60">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {company.tags.map(t => (
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
                  <p className="text-3xl font-display font-bold text-dark-950">{formatPrice(company.price)}</p>
                  <p className="text-xs text-dark-700/50 mt-0.5">One-time purchase</p>
                </div>
                {user ? (() => {
                  const inCart = hasItem(company.id)
                  return (
                    <>
                      <button
                        onClick={() => navigate(`/companies/checkout/${slug}`)}
                        className="btn-primary w-full justify-center py-3 gap-2"
                      >
                        <ShoppingCart size={16} /> Buy Now · {formatPrice(company.price)}
                      </button>
                      <button
                        onClick={() => addItem({ id: company.id, type: 'company', slug, name: company.name, price: company.price })}
                        className={`btn-outline w-full justify-center py-2.5 gap-2 mt-2 ${inCart ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}
                      >
                        {inCart ? <><Check size={15} /> Added to cart</> : <><ShoppingCart size={15} /> Add to cart</>}
                      </button>
                    </>
                  )
                })() : (
                  <Link to="/login" className="btn-primary w-full justify-center py-3 block text-center">
                    Log in to purchase
                  </Link>
                )}
                <ul className="mt-4 space-y-1.5 text-xs text-dark-700/50">
                  <li>✓ Complete agent team setup</li>
                  <li>✓ {company.agent_count} AI agents included</li>
                  {company.zip_url && <li>✓ Downloadable configuration ZIP</li>}
                </ul>
              </>
            ) : isPaid && hasAccess ? (
              <div className="text-center py-2">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-dark-950 text-sm">
                  {isOwner ? 'Your listing' : 'You own this setup'}
                </p>
                {company.zip_url && (
                  <a
                    href={downloadUrl}
                    className="btn-outline mt-3 w-full justify-center flex items-center gap-2 text-sm"
                  >
                    <Download size={14} /> Download ZIP
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-semibold border border-primary-200 mb-2">Free</span>
                {company.zip_url && hasAccess && (
                  <a
                    href={downloadUrl}
                    className="btn-outline mt-3 w-full justify-center flex items-center gap-2 text-sm"
                  >
                    <Download size={14} /> Download ZIP
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-dark-700/50 uppercase tracking-wider mb-3">Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-700/60">Agents</span>
                <span className="font-medium text-dark-900">{company.agent_count}</span>
              </div>
              {company.industry && (
                <div className="flex justify-between">
                  <span className="text-dark-700/60">Industry</span>
                  <span className="font-medium text-dark-900">{company.industry}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-dark-700/60">Views</span>
                <span className="font-medium text-dark-900">{company.view_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-700/60">Purchases</span>
                <span className="font-medium text-dark-900">{company.purchase_count ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Author */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-dark-700/50 uppercase tracking-wider mb-3">Author</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {company.author?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-dark-900 text-sm">@{company.author?.username}</p>
                {company.author?.full_name && <p className="text-xs text-dark-700/50">{company.author.full_name}</p>}
              </div>
            </div>
          </div>

          {isOwner && (
            <Link to={`/companies/${slug}/edit`} className="btn-outline w-full justify-center block text-center">
              Edit listing
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
