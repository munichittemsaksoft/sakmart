import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { templateApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  long_description: z.string().optional(),
  category: z.string().min(1),
  tags: z.string().optional(),
  agent_count: z.coerce.number().int().min(1),
  monthly_cost: z.coerce.number().optional(),
  monthly_revenue_min: z.coerce.number().optional(),
  status: z.enum(['draft', 'published', 'archived']),
})

const CATEGORIES = ['Marketing','SaaS','E-commerce','Agency','Media','Finance','Other']

export default function EditTemplatePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', slug],
    queryFn: () => templateApi.get(slug),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (template) {
      reset({
        title: template.title,
        description: template.description || '',
        long_description: template.long_description || '',
        category: template.category,
        tags: template.tags?.join(', ') || '',
        agent_count: template.agent_count,
        monthly_cost: template.monthly_cost ? template.monthly_cost / 100 : '',
        monthly_revenue_min: template.monthly_revenue_min ? template.monthly_revenue_min / 100 : '',
        status: template.status,
      })
    }
  }, [template, reset])

  const mutation = useMutation({
    mutationFn: (data) => templateApi.update(slug, data),
    onSuccess: (updated) => {
      toast.success('Template updated!')
      qc.invalidateQueries(['template', slug])
      navigate(`/templates/${updated.slug}`)
    },
    onError: () => toast.error('Update failed'),
  })

  const onSubmit = (values) => {
    mutation.mutate({
      ...values,
      tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      monthly_cost: values.monthly_cost ? Math.round(values.monthly_cost * 100) : undefined,
      monthly_revenue_min: values.monthly_revenue_min ? Math.round(values.monthly_revenue_min * 100) : undefined,
    })
  }

  if (isLoading) return <div className="flex justify-center py-32"><Spinner size={28} /></div>
  if (!template) return <div className="text-center py-32 text-dark-700/50">Template not found.</div>
  if (user && String(template.author?.id) !== String(user.id) && user.role !== 'admin') {
    return <div className="text-center py-32 text-red-500">Not authorized.</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-accent-500 font-semibold text-sm uppercase tracking-wider mb-1">Edit</p>
        <h1 className="font-display font-bold text-3xl text-dark-950">Edit Template</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-5">
          <F label="Status" error={errors.status}>
            <select {...register('status')} className="input">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </F>
          <F label="Title *" error={errors.title}>
            <input {...register('title')} className="input" />
          </F>
          <F label="Category *" error={errors.category}>
            <select {...register('category')} className="input">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </F>
          <F label="Short description" error={errors.description}>
            <input {...register('description')} className="input" />
          </F>
          <F label="Full description" error={errors.long_description}>
            <textarea {...register('long_description')} rows={5} className="input resize-none" />
          </F>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <F label="Agent count" error={errors.agent_count}>
              <input {...register('agent_count')} type="number" min={1} className="input" />
            </F>
            <F label="Est. cost/mo ($)" error={errors.monthly_cost}>
              <input {...register('monthly_cost')} type="number" className="input" />
            </F>
            <F label="Est. revenue/mo ($)" error={errors.monthly_revenue_min}>
              <input {...register('monthly_revenue_min')} type="number" className="input" />
            </F>
          </div>
          <F label="Tags (comma-separated)">
            <input {...register('tags')} className="input" />
          </F>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center py-3">
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={() => navigate(`/templates/${slug}`)} className="btn-outline px-6">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function F({ label, error, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  )
}
