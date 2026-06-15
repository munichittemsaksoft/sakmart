import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Puzzle, Search, Plus, ShoppingCart, Check } from 'lucide-react'
import { skillApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { Spinner } from '@/components/ui'
import clsx from 'clsx'

const CATEGORIES = ['Search', 'Email', 'Data', 'Code', 'Communication', 'Media', 'Finance']

function formatPrice(cents) {
  if (!cents || cents <= 0) return null
  return `$${(cents / 100).toFixed(2)}`
}

function SkillCard({ skill }) {
  const { user } = useAuthStore()
  const { addItem, hasItem } = useCartStore()
  const isPaid = skill.price > 0
  const price = formatPrice(skill.price)
  const inCart = isPaid && hasItem(skill.id)
  const isOwner = user && String(skill.author?.id) === String(user.id)

  function handleAddToCart(e) {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id: skill.id, type: 'skill', slug: skill.slug, name: skill.name, price: skill.price })
  }

  return (
    <Link to={`/skills/${skill.slug}`} className="card block group overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Puzzle size={20} className="text-amber-600" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {price ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {price}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200">
                Free
              </span>
            )}
            {skill.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {skill.category}
              </span>
            )}
          </div>
        </div>

        <h3 className="font-display font-semibold text-dark-950 text-base leading-snug mb-0.5 group-hover:text-primary-600 transition-colors line-clamp-1">
          {skill.name}
        </h3>

        {skill.description && (
          <p className="text-sm text-dark-700/70 leading-relaxed line-clamp-2 mb-3">{skill.description}</p>
        )}

        {skill.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skill.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs text-dark-700/60 bg-surface-muted rounded px-2 py-0.5">#{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-dark-700/50 border-t border-surface-border pt-3">
          <span>by @{skill.author?.username}</span>
          {isPaid && user && !isOwner && (
            <button
              onClick={handleAddToCart}
              title={inCart ? 'In cart' : 'Add to cart'}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                inCart
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-surface-muted text-dark-700/50 hover:bg-amber-50 hover:text-amber-600'
              )}
            >
              {inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function SkillsMarketPage() {
  const { user } = useAuthStore()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills', search, category],
    queryFn: () => skillApi.list({ q: search || undefined, category: category || undefined }),
  })

  function handleSearch(e) {
    e.preventDefault()
    setSearch(q)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Puzzle size={24} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">Marketplace</span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-3xl text-dark-950">AI Skills</h1>
            <p className="text-dark-700/60 mt-1">Plug-and-play capabilities for your AI agents — search, email, data, and more</p>
          </div>
          {user && (
            <Link to="/skills/submit" className="btn-accent flex items-center gap-2 text-sm px-4 py-2">
              <Plus size={15} /> List a Skill
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-700/40" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search skills…"
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn-primary px-5">Search</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory('')}
            className={clsx('text-xs px-3 py-1.5 rounded-lg border transition-colors', category === '' ? 'bg-primary-500 text-white border-primary-500' : 'border-surface-border text-dark-700 hover:bg-surface-muted')}
          >
            All
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? '' : c)}
              className={clsx('text-xs px-3 py-1.5 rounded-lg border transition-colors', category === c ? 'bg-amber-500 text-white border-amber-500' : 'border-surface-border text-dark-700 hover:bg-surface-muted')}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : skills.length === 0 ? (
        <div className="text-center py-20 card p-12">
          <Puzzle size={40} className="text-dark-700/20 mx-auto mb-4" />
          <p className="font-semibold text-dark-950 mb-1">No skills found</p>
          <p className="text-sm text-dark-700/50 mb-5">
            {search || category ? 'Try different filters.' : 'Be the first to list an AI skill.'}
          </p>
          {user && <Link to="/skills/submit" className="btn-primary">List a Skill</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {skills.map(s => <SkillCard key={s.id} skill={s} />)}
        </div>
      )}
    </div>
  )
}
