import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

// ── Login ─────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
})

export function LoginPage() {
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values) => {
    const res = await login(values)
    if (res.success) {
      toast.success('Welcome back!')
      navigate('/')
    } else {
      toast.error(res.error)
    }
  }

  return (
    <AuthLayout title="Log in to SAKmart" sub="Don't have an account?" subLink={<Link to="/register" className="text-primary-500 font-medium">Sign up</Link>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
        <Field label="Email" error={errors.email}>
          <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
        </Field>
        <Field label="Password" error={errors.password}>
          <input {...register('password')} type="password" className="input" placeholder="••••••••" />
        </Field>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}

// ── Register ─────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, _ and - only'),
  password: z.string().min(8, 'Minimum 8 characters'),
  full_name: z.string().optional(),
})

export function RegisterPage() {
  const { register: storeRegister, loading } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (values) => {
    const res = await storeRegister(values)
    if (res.success) {
      toast.success('Account created! Please log in.')
      navigate('/login')
    } else {
      toast.error(res.error)
    }
  }

  return (
    <AuthLayout title="Create your account" sub="Already have an account?" subLink={<Link to="/login" className="text-primary-500 font-medium">Log in</Link>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
        <Field label="Full name" error={errors.full_name}>
          <input {...register('full_name')} className="input" placeholder="Jane Smith" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
        </Field>
        <Field label="Username" error={errors.username}>
          <input {...register('username')} className="input" placeholder="janesmith" />
        </Field>
        <Field label="Password" error={errors.password}>
          <input {...register('password')} type="password" className="input" placeholder="Min. 8 characters" />
        </Field>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}

// ── Shared ────────────────────────────────────────────────────

function AuthLayout({ title, sub, subLink, children }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-display font-bold">C</span>
            </div>
          </Link>
          <h1 className="font-display font-bold text-2xl text-dark-950">{title}</h1>
          <p className="text-sm text-dark-700/60 mt-1.5">
            {sub} {subLink}
          </p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  )
}
