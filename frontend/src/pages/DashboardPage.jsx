import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { GitFork, Star, Eye, Plus, Edit2 } from 'lucide-react'
import { userApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['user-templates', user?.username],
    queryFn: () => userApi.templates(user.username),
    enabled: !!user,
  })

  if (!user) return <div className="text-center py-20">Please log in.</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-accent-500 font-semibold text-sm uppercase tracking-wider mb-1">Dashboard</p>
          <h1 className="font-display font-bold text-3xl text-dark-950">My Templates</h1>
        </div>
        <Link to="/submit" className="btn-accent">
          <Plus size={16} /> New Template
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: GitFork, label: 'Total Forks', value: data?.items?.reduce((s, t) => s + (t.fork_count ?? 0), 0) ?? 0 },
          { icon: Star,    label: 'Total Stars', value: data?.items?.reduce((s, t) => s + (t.star_count ?? 0), 0) ?? 0 },
          { icon: Eye,     label: 'Total Views', value: data?.items?.reduce((s, t) => s + (t.view_count ?? 0), 0) ?? 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-5 text-center">
            <Icon size={18} className="text-primary-400 mx-auto mb-1" />
            <p className="font-display font-bold text-2xl text-dark-950">{value}</p>
            <p className="text-xs text-dark-700/50">{label}</p>
          </div>
        ))}
      </div>

      {/* Templates table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data?.items?.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-dark-700/50 mb-4">You haven't submitted any templates yet.</p>
          <Link to="/submit" className="btn-primary">Submit your first template</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft border-b border-surface-border">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-dark-700/60">Template</th>
                <th className="text-left px-4 py-3 font-semibold text-dark-700/60 hidden sm:table-cell">Category</th>
                <th className="text-center px-4 py-3 font-semibold text-dark-700/60">Forks</th>
                <th className="text-center px-4 py-3 font-semibold text-dark-700/60 hidden sm:table-cell">Stars</th>
                <th className="text-left px-4 py-3 font-semibold text-dark-700/60">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.items.map((t) => (
                <tr key={t.id} className="hover:bg-surface-soft transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/templates/${t.slug}`} className="font-medium text-dark-950 hover:text-primary-500">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell text-dark-700/60">{t.category}</td>
                  <td className="px-4 py-3.5 text-center">{t.fork_count}</td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">{t.star_count}</td>
                  <td className="px-4 py-3.5">
                    <span className={`badge ${t.status === 'published' ? 'badge-green' : 'badge-gray'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link to={`/templates/${t.slug}/edit`} className="btn-ghost text-xs p-1.5">
                      <Edit2 size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
