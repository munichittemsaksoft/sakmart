import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingCart, Trash2, Bot, Layers, Puzzle, ArrowRight, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function CartDrawer() {
  const navigate = useNavigate()
  const { items, isOpen, closeCart, removeItem, total } = useCartStore()
  const cartTotal = total()

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') closeCart() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, closeCart])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={18} className="text-primary-500" />
            <h2 className="font-display font-bold text-dark-950">Cart</h2>
            {items.length > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-dark-700/60 hover:text-dark-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center mb-4">
                <ShoppingBag size={28} className="text-dark-700/25" />
              </div>
              <p className="font-semibold text-dark-950 mb-1">Your cart is empty</p>
              <p className="text-sm text-dark-700/50 mb-6 max-w-[200px]">
                Add templates or agents to start building your AI stack
              </p>
              <button
                onClick={closeCart}
                className="btn-outline text-sm"
              >
                Keep browsing
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-muted rounded-xl group">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  item.type === 'agent' ? 'bg-violet-50' : item.type === 'skill' ? 'bg-amber-50' : 'bg-primary-50'
                }`}>
                  {item.type === 'agent'
                    ? <Bot size={18} className="text-violet-600" />
                    : item.type === 'skill'
                      ? <Puzzle size={18} className="text-amber-600" />
                      : <Layers size={18} className="text-primary-600" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-950 truncate leading-tight">{item.name}</p>
                  <p className="text-xs text-dark-700/50 capitalize mt-0.5">{item.type}</p>
                </div>

                {/* Price + remove */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-dark-950">{formatPrice(item.price)}</p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="mt-0.5 text-dark-700/30 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-surface-border px-5 py-5 space-y-4 shrink-0 bg-white">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-700/60">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
              <div className="text-right">
                <p className="text-xs text-dark-700/40 mb-0.5">Total</p>
                <p className="font-display font-bold text-xl text-dark-950">{formatPrice(cartTotal)}</p>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              className="btn-primary w-full justify-center py-3 gap-2 text-base"
              onClick={() => { closeCart(); navigate('/cart/checkout') }}
            >
              Checkout · {formatPrice(cartTotal)} <ArrowRight size={16} />
            </button>

            <p className="text-center text-xs text-dark-700/40">
              Demo mode — no real charges
            </p>
          </div>
        )}
      </div>
    </>
  )
}
