import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { templateApi } from '@/utils/api'
import TemplateCard from '@/components/templates/TemplateCard'
import { Spinner, CategoryFilter, Pagination, PageHeader, Select } from '@/components/ui'

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest' },
  { value: 'fork_count', label: 'Most forked' },
  { value: 'star_count', label: 'Most starred' },
  { value: 'view_count', label: 'Most viewed' },
]

export default function TemplatesPage() {
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState('created_at')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['templates', page, category, search, sortBy],
    queryFn: () => templateApi.list({ page, size: 12, category: category || undefined, search: search || undefined, sort_by: sortBy }),
    keepPreviousData: true,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleCategory = (cat) => {
    setCategory(cat)
    setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader
        eyebrow="Marketplace"
        title="Browse Templates"
        subtitle={`${data?.total ?? '...'} agentic company templates`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-700/40" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search templates…"
            className="input pl-9"
          />
        </form>
        <Select
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
          className="w-44 shrink-0"
        />
      </div>

      <CategoryFilter value={category} onChange={handleCategory} />
      <div className="mt-6" />

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner size={28} /></div>
      ) : (
        <>
          {isFetching && <div className="flex justify-end mb-2"><Spinner size={16} /></div>}
          {data?.items?.length === 0 ? (
            <div className="text-center py-20 text-dark-700/50">No templates found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data?.items?.map((t) => <TemplateCard key={t.id} template={t} />)}
            </div>
          )}
          <Pagination page={page} pages={data?.pages ?? 1} onChange={setPage} />
        </>
      )}
    </div>
  )
}
