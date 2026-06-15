import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, Search, Plus, Users, ShoppingCart } from 'lucide-react'
import { companyApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'

function formatPrice(cents) {
  if (!cents || cents <= 0) return null
  return `$${(cents / 100).toFixed(2)}`
}

function CompanyCard({ company }) {
  const price = formatPrice(company.price)
  return (
    <Link to={`/companies/${company.slug}`} className="card block group overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-blue-600" />
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
            {company.industry && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {company.industry}
              </span>
            )}
          </div>
        </div>

        <h3 className="font-display font-semibold text-dark-950 text-base leading-snug mb-0.5 group-hover:text-primary-600 transition-colors line-clamp-1">
          {company.name}
        </h3>

        {company.description && (
          <p className="text-sm text-dark-700/70 leading-relaxed line-clamp-2 mb-3">{company.description}</p>
        )}

        {company.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {company.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs text-dark-700/60 bg-surface-muted rounded px-2 py-0.5">#{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-dark-700/50 border-t border-surface-border pt-3">
          <span className="flex items-center gap-1">
            <Users size={11} /> {company.agent_count} agent{company.agent_count !== 1 ? 's' : ''}
          </span>
          <span>by @{company.author?.username}</span>
        </div>
      </div>
    </Link>
  )
}

export default function CompaniesMarketPage() {
  const { user } = useAuthStore()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', search],
    queryFn: () => companyApi.list({ q: search || undefined }),
  })

  function handleSearch(e) {
    e.preventDefault()
    setSearch(q)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={24} className="text-blue-500" />
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Marketplace</span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-3xl text-dark-950">Company AI Setups</h1>
            <p className="text-dark-700/60 mt-1">Complete AI agent teams for companies, ready to deploy</p>
          </div>
          {user && (
            <Link to="/companies/submit" className="btn-accent flex items-center gap-2 text-sm px-4 py-2">
              <Plus size={15} /> List a Company Setup
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-700/40" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search company setups…" className="input pl-9 w-full" />
          </div>
          <button type="submit" className="btn-primary px-5">Search</button>
        </form>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20 card p-12">
          <Building2 size={40} className="text-dark-700/20 mx-auto mb-4" />
          <p className="font-semibold text-dark-950 mb-1">No company setups found</p>
          <p className="text-sm text-dark-700/50 mb-5">
            {search ? 'Try a different search.' : 'Be the first to share a company AI setup.'}
          </p>
          {user && <Link to="/companies/submit" className="btn-primary">List a Company Setup</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {companies.map(c => <CompanyCard key={c.id} company={c} />)}
        </div>
      )}
    </div>
  )
}
