import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi, authApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import { User, Mail, AtSign, FileText, Lock, Eye, EyeOff, Save } from 'lucide-react'
import toast from 'react-hot-toast'

function Field({ icon: Icon, label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-dark-700/60 uppercase tracking-wider">
        <Icon size={12} /> {label}
      </label>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const { user, init } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
  })

  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false })
  const [pwdError, setPwdError] = useState('')

  const profileMutation = useMutation({
    mutationFn: (data) => userApi.updateMe(data),
    onSuccess: () => {
      init()
      toast.success('Profile updated')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update profile'),
  })

  const passwordMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      setPwd({ current_password: '', new_password: '', confirm: '' })
      toast.success('Password changed')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to change password'),
  })

  if (!user) {
    return (
      <div className="text-center py-32">
        <p className="text-dark-700/50 mb-4">Please log in to view your profile.</p>
        <button onClick={() => navigate('/login')} className="btn-primary">Log in</button>
      </div>
    )
  }

  const handleProfileSave = (e) => {
    e.preventDefault()
    profileMutation.mutate({
      full_name: profile.full_name || null,
      bio: profile.bio || null,
    })
  }

  const handlePasswordSave = (e) => {
    e.preventDefault()
    setPwdError('')
    if (pwd.new_password !== pwd.confirm) {
      setPwdError('New passwords do not match')
      return
    }
    passwordMutation.mutate({
      current_password: pwd.current_password,
      new_password: pwd.new_password,
    })
  }

  const toggle = (field) => setShowPwd(s => ({ ...s, [field]: !s[field] }))

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center
                        text-white font-display font-bold text-2xl shrink-0">
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-dark-950">{user.full_name || user.username}</h1>
          <p className="text-dark-700/50 text-sm">@{user.username}</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-dark-950 border-b border-surface-border pb-3">
          Account Information
        </h2>
        <div className="grid gap-4">
          <Field icon={AtSign} label="Username">
            <div className="input bg-surface-soft text-dark-700/60 cursor-not-allowed">{user.username}</div>
          </Field>
          <Field icon={Mail} label="Email">
            <div className="input bg-surface-soft text-dark-700/60 cursor-not-allowed">{user.email}</div>
          </Field>
          <Field icon={User} label="Role">
            <div className="input bg-surface-soft text-dark-700/60 cursor-not-allowed capitalize">{user.role}</div>
          </Field>
          <Field icon={User} label="Member Since">
            <div className="input bg-surface-soft text-dark-700/60 cursor-not-allowed">
              {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </Field>
        </div>
      </div>

      {/* Edit Profile */}
      <form onSubmit={handleProfileSave} className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-dark-950 border-b border-surface-border pb-3">
          Edit Profile
        </h2>
        <Field icon={User} label="Full Name">
          <input
            className="input w-full"
            placeholder="Your full name"
            value={profile.full_name}
            onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
          />
        </Field>
        <Field icon={FileText} label="Bio">
          <textarea
            className="input w-full resize-none"
            rows={3}
            placeholder="Tell people a bit about yourself"
            value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
          />
        </Field>
        <div className="flex justify-end">
          <button type="submit" disabled={profileMutation.isPending} className="btn-primary flex items-center gap-2">
            {profileMutation.isPending ? <Spinner size={14} /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordSave} className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-dark-950 border-b border-surface-border pb-3">
          Change Password
        </h2>

        {['current', 'new', 'confirm'].map((key) => {
          const fieldKey = key === 'current' ? 'current_password' : key === 'new' ? 'new_password' : 'confirm'
          const labels = { current: 'Current Password', new: 'New Password', confirm: 'Confirm New Password' }
          return (
            <Field key={key} icon={Lock} label={labels[key]}>
              <div className="relative">
                <input
                  type={showPwd[key] ? 'text' : 'password'}
                  className="input w-full pr-10"
                  placeholder={labels[key]}
                  value={pwd[fieldKey]}
                  onChange={e => setPwd(p => ({ ...p, [fieldKey]: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-700/40 hover:text-dark-700"
                >
                  {showPwd[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
          )
        })}

        {pwdError && <p className="text-sm text-red-500">{pwdError}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={passwordMutation.isPending} className="btn-primary flex items-center gap-2">
            {passwordMutation.isPending ? <Spinner size={14} /> : <Lock size={14} />}
            Change Password
          </button>
        </div>
      </form>
    </div>
  )
}
