import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ShoppingCart, CreditCard, Lock, ShieldCheck, Bot, Layers, Puzzle,
  CheckCircle2, AlertCircle, ArrowLeft, Trash2,
} from 'lucide-react'
import { purchaseApi, agentProductApi, skillApi } from '@/utils/api'
import { useCartStore } from '@/store/cartStore'
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

export default function CartCheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items, removeItem, clear, total } = useCartStore()

  const [form, setForm] = useState({
    cardholder_name: 'Test User',
    card_number: '4242 4242 4242 4242',
    expiry: '12/27',
    cvv: '123',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [results, setResults] = useState([])  // per-item results after checkout
  const [done, setDone] = useState(false)

  const cartTotal = total()

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const payment = {
        cardholder_name: form.cardholder_name,
        card_number: form.card_number.replace(/\s/g, ''),
        expiry: form.expiry,
        cvv: form.cvv,
      }

      const outcomes = []
      for (const item of items) {
        try {
          if (item.type === 'template') {
            await purchaseApi.buy(item.slug, payment)
          } else if (item.type === 'agent') {
            await agentProductApi.buy(item.slug, payment)
          } else if (item.type === 'skill') {
            await skillApi.buy(item.slug, payment)
          }
          outcomes.push({ item, ok: true })
        } catch (err) {
          const detail = err.response?.data?.detail || 'Purchase failed'
          outcomes.push({ item, ok: false, error: detail })
        }
      }
      return outcomes
    },
    onSuccess: (outcomes) => {
      setResults(outcomes)
      setDone(true)
      const succeeded = outcomes.filter(o => o.ok).length
      if (succeeded > 0) {
        clear()
        toast.success(`${succeeded} item${succeeded !== 1 ? 's' : ''} purchased!`)
      }
    },
    onError: () => toast.error('Checkout failed'),
  })

  function validate() {
    const e = {}
    if (!form.cardholder_name.trim()) e.cardholder_name = 'Required'
    if (form.card_number.replace(/\s/g, '').length !== 16) e.card_number = 'Must be 16 digits'
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) e.expiry = 'Format MM/YY'
    if (!/^\d{3,4}$/.test(form.cvv)) e.cvv = '3–4 digits'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (validate()) checkoutMutation.mutate()
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingCart size={40} className="text-dark-700/20 mx-auto mb-4" />
        <p className="font-semibold text-dark-950 mb-2">Sign in to checkout</p>
        <Link to="/login" className="btn-primary">Log in</Link>
      </div>
    )
  }

  if (items.length === 0 && !done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingCart size={40} className="text-dark-700/20 mx-auto mb-4" />
        <p className="font-semibold text-dark-950 mb-2">Your cart is empty</p>
        <div className="flex justify-center gap-3 mt-4">
          <Link to="/templates" className="btn-outline">Browse templates</Link>
          <Link to="/agents" className="btn-outline">Browse agents</Link>
        </div>
      </div>
    )
  }

  // ── Post-checkout success screen ───────────────────────────────────────────
  if (done) {
    const succeeded = results.filter(o => o.ok)
    const failed = results.filter(o => !o.ok)
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-dark-950 mb-1">
            {succeeded.length > 0 ? 'Purchase complete!' : 'Nothing to purchase'}
          </h1>
          <p className="text-dark-700/60 text-sm mb-6">
            {succeeded.length} of {results.length} item{results.length !== 1 ? 's' : ''} purchased
          </p>

          {failed.length > 0 && (
            <div className="text-left space-y-2 mb-6">
              {failed.map(({ item, error }) => (
                <div key={item.id} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span><strong>{item.name}</strong>: {error}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/purchases" className="btn-primary">View my purchases</Link>
            <Link to="/templates" className="btn-outline">Keep shopping</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Checkout form ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/templates" className="inline-flex items-center gap-1.5 text-sm text-dark-700/60 hover:text-primary-500 mb-8">
        <ArrowLeft size={15} /> Continue shopping
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Payment form */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard size={20} className="text-primary-500" />
              <h1 className="font-display font-bold text-xl text-dark-950">Payment details</h1>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-2 text-sm text-amber-800">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <span><strong>Demo mode:</strong> Mock payment gateway — no real charges.</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Cardholder name</label>
                <input
                  className={`input ${fieldErrors.cardholder_name ? 'border-red-400' : ''}`}
                  value={form.cardholder_name}
                  onChange={e => setForm(f => ({ ...f, cardholder_name: e.target.value }))}
                />
                {fieldErrors.cardholder_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.cardholder_name}</p>}
              </div>

              <div>
                <label className="label">Card number</label>
                <div className="relative">
                  <input
                    className={`input pr-10 font-mono tracking-wider ${fieldErrors.card_number ? 'border-red-400' : ''}`}
                    value={form.card_number}
                    onChange={e => setForm(f => ({ ...f, card_number: formatCard(e.target.value) }))}
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                  />
                  <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-700/30" />
                </div>
                {fieldErrors.card_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.card_number}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Expiry (MM/YY)</label>
                  <input
                    className={`input font-mono ${fieldErrors.expiry ? 'border-red-400' : ''}`}
                    value={form.expiry}
                    onChange={e => setForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/YY"
                    inputMode="numeric"
                  />
                  {fieldErrors.expiry && <p className="text-xs text-red-500 mt-1">{fieldErrors.expiry}</p>}
                </div>
                <div>
                  <label className="label">CVV</label>
                  <div className="relative">
                    <input
                      className={`input font-mono ${fieldErrors.cvv ? 'border-red-400' : ''}`}
                      value={form.cvv}
                      onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="123"
                      inputMode="numeric"
                      type="password"
                    />
                    <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-700/30" />
                  </div>
                  {fieldErrors.cvv && <p className="text-xs text-red-500 mt-1">{fieldErrors.cvv}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={checkoutMutation.isPending}
                className="btn-primary w-full justify-center py-3 text-base mt-2"
              >
                {checkoutMutation.isPending ? (
                  <><Spinner size={16} /> Processing {items.length} item{items.length !== 1 ? 's' : ''}…</>
                ) : (
                  <><Lock size={16} /> Pay {formatPrice(cartTotal)}</>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-dark-700/40 mt-4 flex items-center justify-center gap-1">
              <Lock size={11} /> Secured by mock payment gateway
            </p>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="card p-5 sticky top-6">
            <h2 className="font-display font-semibold text-sm text-dark-700/60 uppercase tracking-wider mb-4">
              Order summary
            </h2>

            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'agent' ? 'bg-violet-50' : item.type === 'skill' ? 'bg-amber-50' : 'bg-primary-50'
                  }`}>
                    {item.type === 'agent'
                      ? <Bot size={15} className="text-violet-600" />
                      : item.type === 'skill'
                        ? <Puzzle size={15} className="text-amber-600" />
                        : <Layers size={15} className="text-primary-600" />
                    }
                  </div>
                  <p className="flex-1 text-sm text-dark-800 truncate min-w-0">{item.name}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-dark-950">{formatPrice(item.price)}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-dark-700/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-border pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-dark-700/50">
                <span>Subtotal ({items.length} items)</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-dark-700/40">
                <span>Tax</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="flex justify-between pt-3 font-display font-bold text-dark-950 border-t border-surface-border mt-2">
              <span>Total</span>
              <span className="text-primary-600 text-lg">{formatPrice(cartTotal)}</span>
            </div>

            <div className="mt-4 space-y-1 text-xs text-dark-700/50">
              <p>✓ Instant access after payment</p>
              <p>✓ All items in one transaction</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
