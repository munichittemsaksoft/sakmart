import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GitFork, Star, Eye, Users, ArrowLeft, Layers } from 'lucide-react'
import { templateApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function AgentTier({ label, agents, color }) {
  if (!agents.length) return null
  return (
    <div className="mb-4">
      <p className={clsx('text-xs font-semibold uppercase tracking-wider mb-2', color)}>{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {agents.map((a) => (
          <div key={a.id} className="bg-surface-soft rounded border border-surface-border px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-dark-950">{a.role}</p>
                <p className="text-xs text-dark-700/60 mt-0.5">{a.model}</p>
              </div>
              {a.schedule && (
                <span className="text-xs bg-primary-50 text-primary-600 rounded-full px-2 py-0.5 shrink-0">
                  {a.schedule}
                </span>
              )}
            </div>
            {a.responsibilities?.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {a.responsibilities.map((r) => (
                  <li key={r} className="text-xs text-dark-700/60 flex items-start gap-1.5">
                    <span className="text-primary-400 mt-0.5">·</span>{r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TemplateDetailPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', slug],
    queryFn: () => templateApi.get(slug),
  })

  const forkMutation = useMutation({
    mutationFn: () => templateApi.fork(slug),
    onSuccess: () => {
      toast.success('Template forked!')
      qc.invalidateQueries(['template', slug])
    },
    onError: () => toast.error('Fork failed'),
  })

  const starMutation = useMutation({
    mutationFn: () => templateApi.star(slug),
    onSuccess: (data) => {
      toast.success(data.starred ? 'Starred!' : 'Unstarred')
      qc.invalidateQueries(['template', slug])
    },
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner size={28} /></div>
  if (!template) return <div className="text-center py-32 text-dark-700/50">Template not found</div>

  const leadership = template.agents.filter((a) => a.tier === 'Leadership')
  const operations  = template.agents.filter((a) => a.tier === 'Operations')
  const execution   = template.agents.filter((a) => a.tier === 'Execution')

  const fmt = (cents) => cents ? `$${(cents / 100).toLocaleString()}` : '—'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/templates" className="inline-flex items-center gap-1.5 text-sm text-dark-700/60 hover:text-primary-500 mb-6">
        <ArrowLeft size={15} /> Back to templates
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="badge badge-blue">{template.category}</span>
              <span className="badge badge-green">Active</span>
              {template.tags.map((t) => (
                <span key={t} className="text-xs text-dark-700/50">#{t}</span>
              ))}
            </div>
            <h1 className="font-display font-bold text-4xl text-dark-950 tracking-tight mb-3">
              {template.title}
            </h1>
            {template.description && (
              <p className="text-dark-700/70 text-lg leading-relaxed">{template.description}</p>
            )}
          </div>

          {/* Long description */}
          {template.long_description && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg mb-3">About this template</h2>
              <p className="text-dark-700/70 leading-relaxed whitespace-pre-wrap">
                {template.long_description}
              </p>
            </div>
          )}

          {/* Agent hierarchy */}
          {template.agents.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                <Layers size={18} className="text-primary-500" />
                Agent Hierarchy
              </h2>
              <AgentTier label="Leadership" agents={leadership} color="text-violet-600" />
              <AgentTier label="Operations" agents={operations} color="text-primary-600" />
              <AgentTier label="Execution"  agents={execution}  color="text-accent-600" />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Action card */}
          <div className="card p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: GitFork, label: 'Forks',  value: template.fork_count },
                { icon: Star,    label: 'Stars',  value: template.star_count },
                { icon: Eye,     label: 'Views',  value: template.view_count },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center">
                  <Icon size={16} className="text-primary-400 mx-auto mb-1" />
                  <p className="font-display font-bold text-xl text-dark-950">{value}</p>
                  <p className="text-xs text-dark-700/50">{label}</p>
                </div>
              ))}
            </div>

            {/* Economics */}
            <div className="bg-surface-soft rounded-lg p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark-700/60">Agents</span>
                <span className="font-semibold">{template.agent_count}</span>
              </div>
              {template.monthly_cost && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-700/60">Est. cost/mo</span>
                  <span className="font-semibold">{fmt(template.monthly_cost)}</span>
                </div>
              )}
              {template.monthly_revenue_min && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-700/60">Est. revenue</span>
                  <span className="font-semibold text-emerald-600">
                    {fmt(template.monthly_revenue_min)}
                    {template.monthly_revenue_max ? `–${fmt(template.monthly_revenue_max)}` : '+'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            {user ? (
              <div className="space-y-2">
                <button
                  onClick={() => forkMutation.mutate()}
                  disabled={forkMutation.isPending}
                  className="btn-primary w-full justify-center py-3"
                >
                  <GitFork size={16} />
                  {forkMutation.isPending ? 'Forking…' : 'Fork this template'}
                </button>
                <button
                  onClick={() => starMutation.mutate()}
                  disabled={starMutation.isPending}
                  className="btn-outline w-full justify-center"
                >
                  <Star size={15} /> Star
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary w-full justify-center py-3 block text-center">
                Log in to fork
              </Link>
            )}
          </div>

          {/* Author */}
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold shrink-0">
              {template.author?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-dark-700/50 mb-0.5">Created by</p>
              <Link to={`/u/${template.author?.username}`} className="text-sm font-semibold text-dark-950 hover:text-primary-500">
                @{template.author?.username}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
