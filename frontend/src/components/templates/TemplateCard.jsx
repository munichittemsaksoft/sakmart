import { Link } from 'react-router-dom'
import { GitFork, Star, Users, TrendingUp, ShoppingCart, Check } from 'lucide-react'
import clsx from 'clsx'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'

const CATEGORY_COLORS = {
  Marketing:   'badge-orange',
  SaaS:        'badge-blue',
  'E-commerce':'badge-green',
  Agency:      'badge-gray',
  Media:       'badge-gray',
  Finance:     'badge-green',
  Other:       'badge-gray',
}

function formatCurrency(cents) {
  if (!cents) return null
  const n = cents / 100
  if (n >= 1000) return `$${(n/1000).toFixed(0)}k+`
  return `$${n}`
}

export default function TemplateCard({ template }) {
  const { slug, title, description, category, tags = [], agent_count,
    monthly_cost, monthly_revenue_min, fork_count, star_count, author, status, price, id } = template

  const isPaid = price > 0
  const { addItem, hasItem } = useCartStore()
  const { user } = useAuthStore()
  const inCart = isPaid && hasItem(id)
  const isOwner = user && String(author?.id) === String(user.id)

  function handleAddToCart(e) {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id, type: 'template', slug, name: title, price })
  }

  return (
    <Link to={`/templates/${slug}`} className="card block group overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary-500 to-accent-500" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0
                          text-primary-600 font-display font-bold text-base">
            {title[0]}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {isPaid && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {formatCurrency(price)}
              </span>
            )}
            <span className={clsx(CATEGORY_COLORS[category] || 'badge-gray', 'text-xs')}>
              {category}
            </span>
          </div>
        </div>

        <h3 className="font-display font-semibold text-dark-950 text-base leading-snug mb-1.5
                       group-hover:text-primary-600 transition-colors line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-dark-700/70 leading-relaxed line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs text-dark-700/60 bg-surface-muted rounded px-2 py-0.5">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-dark-700/60 border-t border-surface-border pt-3">
          <span className="flex items-center gap-1">
            <Users size={12} className="text-primary-400" />
            {agent_count} agent{agent_count !== 1 ? 's' : ''}
          </span>
          {monthly_cost && (
            <span className="flex items-center gap-1">
              <span className="text-dark-700/40">~cost</span>
              <span className="font-medium text-dark-800">{formatCurrency(monthly_cost)}/mo</span>
            </span>
          )}
          {monthly_revenue_min && (
            <span className="flex items-center gap-1 ml-auto">
              <TrendingUp size={11} className="text-emerald-500" />
              <span className="font-medium text-emerald-600">{formatCurrency(monthly_revenue_min)}</span>
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-dark-700/50">by @{author?.username}</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-dark-700/50">
              <span className="flex items-center gap-1"><GitFork size={12} /> {fork_count}</span>
              <span className="flex items-center gap-1"><Star size={12} /> {star_count}</span>
            </div>

            {/* Cart button — only for paid items when logged in and not own listing */}
            {isPaid && user && !isOwner && (
              <button
                onClick={handleAddToCart}
                title={inCart ? 'In cart' : 'Add to cart'}
                className={clsx(
                  'ml-1 p-1.5 rounded-lg transition-colors',
                  inCart
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-surface-muted text-dark-700/50 hover:bg-primary-50 hover:text-primary-600'
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
