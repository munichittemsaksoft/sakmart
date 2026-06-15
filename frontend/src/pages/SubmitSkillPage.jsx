import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2, Puzzle } from 'lucide-react'
import { skillApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const CATEGORIES = ['Search', 'Email', 'Data', 'Code', 'Communication', 'Media', 'Finance', 'Other']

const schema = z.object({
  name: z.string().min(2, 'Skill name required'),
  category: z.string().optional(),
  description: z.string().optional(),
  long_description: z.string().optional(),
  instructions: z.string().optional(),
  parameters: z.array(z.object({ value: z.string().min(1) })).optional(),
  tags: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  status: z.enum(['draft', 'published']),
})

function F({ label, error, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  )
}

export default function SubmitSkillPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'published',
      parameters: [{ value: '' }],
    },
  })

  const { fields: paramFields, append: appendParam, remove: removeParam } = useFieldArray({ control, name: 'parameters' })

  const mutation = useMutation({
    mutationFn: (data) => skillApi.create(data),
    onSuccess: (skill) => {
      toast.success('Skill listed!')
      navigate(`/skills/${skill.slug}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create listing'),
  })

  if (!user) {
    return <div className="text-center py-32 text-dark-700/50">You must be logged in to list a skill.</div>
  }

  function onSubmit(values) {
    mutation.mutate({
      name: values.name,
      category: values.category || undefined,
      description: values.description || undefined,
      long_description: values.long_description || undefined,
      instructions: values.instructions || undefined,
      parameters: (values.parameters || []).map(p => p.value).filter(Boolean),
      tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      price: values.price ? Math.round(values.price * 100) : null,
      status: values.status,
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Puzzle size={20} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">Marketplace</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-dark-950">List a Skill</h1>
        <p className="text-dark-700/60 mt-1">Share a reusable AI capability with the community</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="font-display font-semibold text-base text-dark-950">Skill Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Status" error={errors.status}>
              <select {...register('status')} className="input">
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (visible)</option>
              </select>
            </F>
            <F label="Category" error={errors.category}>
              <select {...register('category')} className="input">
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
          </div>

          <F label="Skill name *" error={errors.name}>
            <input {...register('name')} className="input" placeholder="e.g. Web Search, Email Sender, PDF Extractor" />
          </F>

          <F label="Short description" error={errors.description}>
            <input {...register('description')} className="input" placeholder="One-line overview" />
          </F>

          <F label="Full description" error={errors.long_description}>
            <textarea {...register('long_description')} rows={4} className="input resize-none"
              placeholder="Detailed overview of what this skill does…" />
          </F>

          <F label="Integration instructions" error={errors.instructions}>
            <textarea {...register('instructions')} rows={5} className="input resize-none font-mono text-sm"
              placeholder="How to integrate and use this skill in an agent…" />
          </F>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Selling price ($) — blank = free" error={errors.price}>
              <input {...register('price')} type="number" min={0} step="0.01" className="input" placeholder="0.00" />
            </F>
            <F label="Tags (comma-separated)">
              <input {...register('tags')} className="input" placeholder="search, web, scraping" />
            </F>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base text-dark-950">Parameters</h2>
            <button type="button" onClick={() => appendParam({ value: '' })}
              className="btn-ghost text-xs flex items-center gap-1">
              <Plus size={13} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {paramFields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <input {...register(`parameters.${i}.value`)} className="input flex-1"
                  placeholder="e.g. query: string — the search query" />
                {paramFields.length > 1 && (
                  <button type="button" onClick={() => removeParam(i)} className="p-2 text-dark-700/40 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full justify-center py-3">
          {mutation.isPending ? 'Creating…' : 'Create listing'}
        </button>
      </form>
    </div>
  )
}
