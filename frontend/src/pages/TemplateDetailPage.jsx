import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GitFork, Star, Eye, ArrowLeft, Layers, Download, Trash2, LayoutList, GitBranch } from 'lucide-react'
import { templateApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import AgentGraph from '@/components/templates/AgentGraph'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useState } from 'react'

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
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [agentView, setAgentView] = useState('graph')

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

  const deleteMutation = useMutation({
    mutationFn: () => templateApi.delete(slug),
    onSuccess: () => {
      toast.success('Template deleted')
      navigate('/templates')
    },
    onError: () => toast.error('Delete failed'),
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner size={28} /></div>
  if (!template) return <div className="text-center py-32 text-dark-700/50">Template not found</div>

  const byTier = (t) => template.agents.filter((a) => (a.tier || '').toLowerCase() === t)
  const leadership = byTier('leadership')
  const operations  = byTier('operations')
  const execution   = byTier('execution')

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Layers size={18} className="text-primary-500" />
                  Agent Hierarchy
                </h2>
                <div className="flex items-center gap-1 bg-surface-soft rounded-lg p-1">
                  <button
                    onClick={() => setAgentView('list')}
                    className={clsx(
                      'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all',
                      agentView === 'list'
                        ? 'bg-white text-dark-950 shadow-sm'
                        : 'text-dark-700/50 hover:text-dark-700',
                    )}
                  >
                    <LayoutList size={13} /> List
                  </button>
                  <button
                    onClick={() => setAgentView('graph')}
                    className={clsx(
                      'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all',
                      agentView === 'graph'
                        ? 'bg-white text-dark-950 shadow-sm'
                        : 'text-dark-700/50 hover:text-dark-700',
                    )}
                  >
                    <GitBranch size={13} /> Graph
                  </button>
                </div>
              </div>

              {agentView === 'list' ? (
                <>
                  <AgentTier label="Leadership" agents={leadership} color="text-violet-600" />
                  <AgentTier label="Operations" agents={operations} color="text-primary-600" />
                  <AgentTier label="Execution"  agents={execution}  color="text-accent-600" />
                </>
              ) : (
                <AgentGraph agents={template.agents} />
              )}
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

            {/* Download — always visible */}
            <div className="pt-2 border-t border-surface-border mt-2">
              {template.zip_url ? (
                <a
                  href={templateApi.downloadUrl(template.slug)}
                  download
                  className="btn-ghost w-full justify-center flex items-center gap-2 text-sm"
                >
                  <Download size={15} /> Download ZIP
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-dark-700/40 py-2">
                  <Download size={15} /> No ZIP available
                </div>
              )}
            </div>
          </div>

          {/* Delete — owner / admin only */}
          {user && (String(template.author?.id) === String(user.id) || ['admin', 'super_admin'].includes(user.role)) && (
            <div className="card p-4">
              {confirmDelete ? (
                <div className="space-y-3">
                  <p className="text-sm text-dark-700/80">Delete this template permanently?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="btn-danger flex-1 justify-center text-sm py-2"
                    >
                      {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="btn-outline flex-1 justify-center text-sm py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 w-full justify-center py-1"
                >
                  <Trash2 size={14} /> Delete template
                </button>
              )}
            </div>
          )}

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
