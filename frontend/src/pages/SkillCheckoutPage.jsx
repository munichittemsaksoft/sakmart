import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, Lock, ShieldCheck, Puzzle } from 'lucide-react'
import { skillApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatCard(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

export default function SkillCheckoutPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [form, setForm] = useState({
    cardholder_name: 'Test User',
    card_number: '4242 4242 4242 4242',
    expiry: '12/27',
    cvv: '123',
  })
  const [errors, setErrors] = useState({})

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', slug],
    queryFn: () => skillApi.get(slug),
  })

  const buyMutation = useMutation({
    mutationFn: () => skillApi.buy(slug, {
      cardholder_name: form.cardholder_name,
      card_number: form.card_number.replace(/\s/g, ''),
      expiry: form.expiry,
      cvv: form.cvv,
    }),
    onSuccess: () => {
      toast.success('Payment successful! You now own this skill.')
      navigate(`/skills/${slug}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Payment failed'),
  })

  function validate() {
    const e = {}
    if (!form.cardholder_name.trim()) e.cardholder_name = 'Required'
    if (form.card_number.replace(/\s/g, '').length !== 16) e.card_number = 'Must be 16 digits'
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) e.expiry = 'Format MM/YY'
    if (!/^\d{3,4}$/.test(form.cvv)) e.cvv = '3–4 digits'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (validate()) buyMutation.mutate()
  }

  if (isLoading) return <div className="flex justify-center py-32"><Spinner size={28} /></div>
  if (!skill) return <div className="text-center py-32 text-dark-700/50">Skill not found</div>
  if (!skill.price || skill.price <= 0) {
    return (
      <div className="text-center py-32 text-dark-700/50">
        This skill is free.{' '}
        <Link to={`/skills/${slug}`} className="text-primary-500 hover:underline">Go back</Link>
      </div>
    )
  }
  if (user && String(skill.author?.id) === String(user.id)) {
    return (
      <div className="text-center py-32 text-dark-700/50">
        You own this skill.{' '}
        <Link to={`/skills/${slug}`} className="text-primary-500 hover:underline">View your listing</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to={`/skills/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-dark-700/60 hover:text-primary-500 mb-8">
        <ArrowLeft size={15} /> Back to skill
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard size={20} className="text-primary-500" />
              <h1 className="font-display font-bold text-xl text-dark-950">Payment details</h1>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-2 text-sm text-amber-800">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <span><strong>Demo mode:</strong> This is a mock payment gateway. No real charges occur.</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Cardholder name</label>
                <input className={`input ${errors.cardholder_name ? 'border-red-400' : ''}`}
                  value={form.cardholder_name}
                  onChange={e => setForm(f => ({ ...f, cardholder_name: e.target.value }))} />
                {errors.cardholder_name && <p className="text-xs text-red-500 mt-1">{errors.cardholder_name}</p>}
              </div>

              <div>
                <label className="label">Card number</label>
                <div className="relative">
                  <input className={`input pr-10 font-mono tracking-wider ${errors.card_number ? 'border-red-400' : ''}`}
                    value={form.card_number}
                    onChange={e => setForm(f => ({ ...f, card_number: formatCard(e.target.value) }))}
                    placeholder="1234 5678 9012 3456" inputMode="numeric" />
                  <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-700/30" />
                </div>
                {errors.card_number && <p className="text-xs text-red-500 mt-1">{errors.card_number}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Expiry (MM/YY)</label>
                  <input className={`input font-mono ${errors.expiry ? 'border-red-400' : ''}`}
                    value={form.expiry}
                    onChange={e => setForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/YY" inputMode="numeric" />
                  {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
                </div>
                <div>
                  <label className="label">CVV</label>
                  <div className="relative">
                    <input className={`input font-mono ${errors.cvv ? 'border-red-400' : ''}`}
                      value={form.cvv}
                      onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="123" inputMode="numeric" type="password" />
                    <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-700/30" />
                  </div>
                  {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
                </div>
              </div>

              <button type="submit" disabled={buyMutation.isPending}
                className="btn-primary w-full justify-center py-3 text-base mt-2">
                {buyMutation.isPending
                  ? <><Spinner size={16} /> Processing…</>
                  : <><Lock size={16} /> Pay {formatPrice(skill.price)}</>}
              </button>
            </form>

            <p className="text-center text-xs text-dark-700/40 mt-4 flex items-center justify-center gap-1">
              <Lock size={11} /> Secured by mock payment gateway
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-5 sticky top-6">
            <h2 className="font-display font-semibold text-sm text-dark-700/60 uppercase tracking-wider mb-4">
              Order summary
            </h2>

            <div className="flex items-start gap-3 pb-4 border-b border-surface-border">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Puzzle size={20} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-dark-950 text-sm leading-snug line-clamp-2">{skill.name}</p>
                {skill.category && <p className="text-xs text-dark-700/50 mt-0.5">{skill.category}</p>}
                <p className="text-xs text-dark-700/40 mt-0.5">by @{skill.author?.username}</p>
              </div>
            </div>

            <div className="space-y-2 py-4 border-b border-surface-border text-sm">
              <div className="flex justify-between">
                <span className="text-dark-700/60">Skill price</span>
                <span className="font-medium">{formatPrice(skill.price)}</span>
              </div>
              <div className="flex justify-between text-dark-700/40">
                <span>Tax</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 font-display font-bold text-dark-950">
              <span>Total</span>
              <span className="text-primary-600 text-lg">{formatPrice(skill.price)}</span>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-dark-700/50">
              <p>✓ Lifetime access</p>
              <p>✓ Full integration instructions</p>
              <p>✓ Parameters & usage guide</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
