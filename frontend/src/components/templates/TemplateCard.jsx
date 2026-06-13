import { Link } from 'react-router-dom'
import { GitFork, Star, Users, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

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
    monthly_cost, monthly_revenue_min, fork_count, star_count, author, status } = template

  return (
    <Link to={`/templates/${slug}`} className="card block group overflow-hidden">
      {/* Thumbnail */}
      <div className="h-3 bg-gradient-to-r from-primary-500 to-accent-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0
                          text-primary-600 font-display font-bold text-base">
            {title[0]}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {status === 'published' && (
              <span className="badge badge-green text-xs">Active</span>
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
          <div className="flex items-center gap-3 text-xs text-dark-700/50">
            <span className="flex items-center gap-1">
              <GitFork size={12} /> {fork_count}
            </span>
            <span className="flex items-center gap-1">
              <Star size={12} /> {star_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
