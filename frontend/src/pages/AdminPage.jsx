import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, Layers, GitFork, Star, Settings, Shield } from 'lucide-react'

const adminApi = {
  stats:           ()          => api.get('/admin/stats').then(r => r.data),
  users:           (page = 1)  => api.get('/admin/users', { params: { page, size: 20 } }).then(r => r.data),
  templates:       ()          => api.get('/admin/templates').then(r => r.data),
  setRole:         (id, role)  => api.patch(`/admin/users/${id}/role`, null, { params: { role } }).then(r => r.data),
  toggleActive:    (id, active)=> api.patch(`/admin/users/${id}/active`, null, { params: { active } }).then(r => r.data),
  setTplStatus:    (id, status)=> api.patch(`/admin/templates/${id}/status`, null, { params: { status } }).then(r => r.data),
  deleteTpl:       (id)        => api.delete(`/admin/templates/${id}`),
  settings:        ()          => api.get('/admin/settings').then(r => r.data),
}

export default function AdminPage() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'admin') return <Navigate to="/" />

  return <AdminDashboard />
}

function AdminDashboard() {
  const qc = useQueryClient()
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats })
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.users })
  const { data: templates, isLoading: tplLoading } = useQuery({ queryKey: ['admin-templates'], queryFn: adminApi.templates })
  const { data: sysSettings } = useQuery({ queryKey: ['admin-settings'], queryFn: adminApi.settings })

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => adminApi.setRole(id, role),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Role updated') },
    onError: () => toast.error('Failed'),
  })
  const activeMut = useMutation({
    mutationFn: ({ id, active }) => adminApi.toggleActive(id, active),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Updated') },
    onError: () => toast.error('Failed'),
  })
  const tplStatusMut = useMutation({
    mutationFn: ({ id, status }) => adminApi.setTplStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['admin-templates']); toast.success('Status updated') },
  })
  const tplDeleteMut = useMutation({
    mutationFn: (id) => adminApi.deleteTpl(id),
    onSuccess: () => { qc.invalidateQueries(['admin-templates']); toast.success('Deleted') },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Shield size={22} className="text-primary-500" />
        <div>
          <p className="text-accent-500 font-semibold text-xs uppercase tracking-wider">Admin</p>
          <h1 className="font-display font-bold text-3xl text-dark-950">Control Panel</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {statsLoading ? <Spinner /> : Object.entries(stats || {}).map(([key, val]) => (
          <div key={key} className="card p-4 text-center">
            <p className="font-display font-bold text-2xl text-dark-950">{val}</p>
            <p className="text-xs text-dark-700/50 capitalize mt-0.5">{key}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Users */}
        <div>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Users size={18} className="text-primary-500" /> Users
          </h2>
          {usersLoading ? <Spinner /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-soft border-b border-surface-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-dark-700/60">User</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-dark-700/60">Role</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-dark-700/60">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {users?.items?.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-soft">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-dark-950">{u.username}</p>
                        <p className="text-xs text-dark-700/40">{u.email}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={u.role}
                          onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value })}
                          className="text-xs border border-surface-border rounded px-2 py-1 bg-white"
                        >
                          {['user','creator','admin'].map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => activeMut.mutate({ id: u.id, active: !u.is_active })}
                          className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'} cursor-pointer`}
                        >
                          {u.is_active ? 'Yes' : 'No'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Templates */}
        <div>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Layers size={18} className="text-primary-500" /> Templates
          </h2>
          {tplLoading ? <Spinner /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-soft border-b border-surface-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-dark-700/60">Title</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-dark-700/60">Status</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {templates?.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-soft">
                      <td className="px-4 py-2.5">
                        <Link to={`/templates/${t.slug}`} className="font-medium text-dark-950 hover:text-primary-500 line-clamp-1">
                          {t.title}
                        </Link>
                        <p className="text-xs text-dark-700/40">@{t.author?.username}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={t.status}
                          onChange={(e) => tplStatusMut.mutate({ id: t.id, status: e.target.value })}
                          className="text-xs border border-surface-border rounded px-2 py-1 bg-white"
                        >
                          {['draft','published','archived'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => { if (confirm('Delete?')) tplDeleteMut.mutate(t.id) }}
                          className="text-red-400 hover:text-red-600 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* System Settings */}
      {sysSettings && (
        <div>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Settings size={18} className="text-primary-500" /> System Configuration
          </h2>
          <div className="card p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(sysSettings).map(([key, val]) => (
                <div key={key} className="bg-surface-soft rounded p-3">
                  <p className="text-xs text-dark-700/50 font-mono mb-1">{key}</p>
                  <p className="text-sm font-medium text-dark-950 break-all">
                    {Array.isArray(val) ? val.join(', ') : String(val ?? '—')}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-dark-700/40 mt-4">
              Settings are read from environment variables. Restart the server after changing .env.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
