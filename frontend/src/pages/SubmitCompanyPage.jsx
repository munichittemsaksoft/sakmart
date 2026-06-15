import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2, Building2, Bot } from 'lucide-react'
import { companyApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const agentSchema = z.object({
  name: z.string().min(1, 'Name required'),
  role: z.string().min(1, 'Role required'),
  model: z.string().min(1),
  tier: z.enum(['Leadership', 'Operations', 'Execution']),
  responsibilities: z.string().optional(),
  parent_name: z.string().optional(),
})

const valueSchema = z.object({ value: z.string().min(1) })

const schema = z.object({
  name: z.string().min(2, 'Company name required'),
  industry: z.string().optional(),
  description: z.string().optional(),
  long_description: z.string().optional(),
  mission: z.string().optional(),
  values: z.array(valueSchema).optional(),
  tags: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  status: z.enum(['draft', 'published']),
  agents: z.array(agentSchema).optional(),
})

const MODELS = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-4o', 'gpt-4o-mini', 'gemini-2.0-flash']
const TIERS = ['Leadership', 'Operations', 'Execution']

function F({ label, error, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  )
}

export default function SubmitCompanyPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'published',
      values: [{ value: '' }],
      agents: [{ name: '', role: '', model: 'claude-sonnet-4-6', tier: 'Execution', responsibilities: '', parent_name: '' }],
    },
  })

  const { fields: valueFields, append: appendValue, remove: removeValue } = useFieldArray({ control, name: 'values' })
  const { fields: agentFields, append: appendAgent, remove: removeAgent } = useFieldArray({ control, name: 'agents' })

  const mutation = useMutation({
    mutationFn: (data) => companyApi.create(data),
    onSuccess: (company) => {
      toast.success('Company setup listed!')
      navigate(`/companies/${company.slug}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create listing'),
  })

  if (!user) {
    return <div className="text-center py-32 text-dark-700/50">You must be logged in to list a company setup.</div>
  }

  function onSubmit(values) {
    const agents = (values.agents || [])
      .filter(a => a.name && a.role)
      .map((a, i) => ({
        name: a.name,
        role: a.role,
        model: a.model,
        tier: a.tier,
        responsibilities: a.responsibilities
          ? a.responsibilities.split('\n').map(r => r.trim()).filter(Boolean)
          : [],
        parent_name: a.parent_name || null,
        position: i,
      }))

    mutation.mutate({
      name: values.name,
      industry: values.industry || undefined,
      description: values.description || undefined,
      long_description: values.long_description || undefined,
      mission: values.mission || undefined,
      values: (values.values || []).map(v => v.value).filter(Boolean),
      tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      price: values.price ? Math.round(values.price * 100) : null,
      status: values.status,
      agents,
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={20} className="text-blue-500" />
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Marketplace</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-dark-950">List a Company Setup</h1>
        <p className="text-dark-700/60 mt-1">Share a complete AI agent team for a business</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company info */}
        <div className="card p-6 space-y-5">
          <h2 className="font-display font-semibold text-base text-dark-950">Company Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Status" error={errors.status}>
              <select {...register('status')} className="input">
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (visible)</option>
              </select>
            </F>
            <F label="Industry" error={errors.industry}>
              <input {...register('industry')} className="input" placeholder="e.g. SaaS, Retail, Finance" />
            </F>
          </div>

          <F label="Company name *" error={errors.name}>
            <input {...register('name')} className="input" placeholder="e.g. Acme Corp AI Team" />
          </F>

          <F label="Short description" error={errors.description}>
            <input {...register('description')} className="input" placeholder="One-line overview" />
          </F>

          <F label="Full description" error={errors.long_description}>
            <textarea {...register('long_description')} rows={4} className="input resize-none"
              placeholder="Detailed overview of the company setup…" />
          </F>

          <F label="Mission statement" error={errors.mission}>
            <textarea {...register('mission')} rows={2} className="input resize-none"
              placeholder="What's the company's mission?" />
          </F>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Selling price ($) — blank = free" error={errors.price}>
              <input {...register('price')} type="number" min={0} step="0.01" className="input" placeholder="0.00" />
            </F>
            <F label="Tags (comma-separated)">
              <input {...register('tags')} className="input" placeholder="saas, marketing, automation" />
            </F>
          </div>
        </div>

        {/* Company values */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base text-dark-950">Company Values</h2>
            <button type="button" onClick={() => appendValue({ value: '' })}
              className="btn-ghost text-xs flex items-center gap-1">
              <Plus size={13} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {valueFields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <input {...register(`values.${i}.value`)} className="input flex-1" placeholder={`Value ${i + 1}`} />
                {valueFields.length > 1 && (
                  <button type="button" onClick={() => removeValue(i)} className="p-2 text-dark-700/40 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Agent team */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base text-dark-950">Agent Team</h2>
            <button
              type="button"
              onClick={() => appendAgent({ name: '', role: '', model: 'claude-sonnet-4-6', tier: 'Execution', responsibilities: '', parent_name: '' })}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <Plus size={13} /> Add Agent
            </button>
          </div>

          <div className="space-y-4">
            {agentFields.map((field, i) => (
              <div key={field.id} className="bg-surface-muted rounded-lg p-4 space-y-3 border border-surface-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Bot size={15} className="text-violet-500" />
                    <span className="text-sm font-medium text-dark-800">Agent {i + 1}</span>
                  </div>
                  {agentFields.length > 1 && (
                    <button type="button" onClick={() => removeAgent(i)} className="text-dark-700/40 hover:text-red-500 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <F error={errors.agents?.[i]?.name}>
                    <input {...register(`agents.${i}.name`)} className="input" placeholder="Agent name" />
                  </F>
                  <F error={errors.agents?.[i]?.role}>
                    <input {...register(`agents.${i}.role`)} className="input" placeholder="Role" />
                  </F>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <F>
                    <select {...register(`agents.${i}.model`)} className="input">
                      {MODELS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </F>
                  <F>
                    <select {...register(`agents.${i}.tier`)} className="input">
                      {TIERS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </F>
                  <F>
                    <input {...register(`agents.${i}.parent_name`)} className="input" placeholder="Reports to…" />
                  </F>
                </div>

                <F label="Responsibilities (one per line)">
                  <textarea
                    {...register(`agents.${i}.responsibilities`)}
                    rows={3}
                    className="input resize-none text-sm"
                    placeholder="Handle customer inquiries&#10;Escalate complex cases&#10;Generate weekly reports"
                  />
                </F>
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
