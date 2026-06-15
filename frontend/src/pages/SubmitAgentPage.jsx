import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2, Bot } from 'lucide-react'
import { agentProductApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const responsibilitySchema = z.object({ value: z.string().min(1) })

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  role: z.string().min(2, 'Role required'),
  model: z.string().min(1, 'Model required'),
  tier: z.enum(['Leadership', 'Operations', 'Execution']),
  description: z.string().optional(),
  instructions: z.string().optional(),
  responsibilities: z.array(responsibilitySchema).optional(),
  tags: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  status: z.enum(['draft', 'published']),
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

export default function SubmitAgentPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tier: 'Execution',
      status: 'published',
      responsibilities: [{ value: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'responsibilities' })

  const mutation = useMutation({
    mutationFn: (data) => agentProductApi.create(data),
    onSuccess: (agent) => {
      toast.success('Agent listed successfully!')
      navigate(`/agents/${agent.slug}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create listing'),
  })

  if (!user) {
    return (
      <div className="text-center py-32">
        <p className="text-dark-700/50 mb-4">You must be logged in to list an agent.</p>
      </div>
    )
  }

  function onSubmit(values) {
    const responsibilities = (values.responsibilities || [])
      .map(r => r.value.trim())
      .filter(Boolean)

    mutation.mutate({
      name: values.name,
      role: values.role,
      model: values.model,
      tier: values.tier,
      description: values.description || undefined,
      instructions: values.instructions || undefined,
      responsibilities,
      tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      price: values.price ? Math.round(values.price * 100) : null,
      status: values.status,
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={20} className="text-violet-500" />
          <span className="text-sm font-semibold text-violet-600 uppercase tracking-wider">Marketplace</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-dark-950">List an Agent</h1>
        <p className="text-dark-700/60 mt-1">Share your AI agent with the community</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <div className="card p-6 space-y-5">
          <h2 className="font-display font-semibold text-base text-dark-950">Agent Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Status" error={errors.status}>
              <select {...register('status')} className="input">
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (visible)</option>
              </select>
            </F>
            <F label="Tier" error={errors.tier}>
              <select {...register('tier')} className="input">
                {TIERS.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
          </div>

          <F label="Agent name *" error={errors.name}>
            <input {...register('name')} className="input" placeholder="e.g. Content Marketing Agent" />
          </F>

          <F label="Role / Job title *" error={errors.role}>
            <input {...register('role')} className="input" placeholder="e.g. SEO Content Writer" />
          </F>

          <F label="Model *" error={errors.model}>
            <select {...register('model')} className="input">
              {MODELS.map(m => <option key={m}>{m}</option>)}
            </select>
          </F>

          <F label="Short description" error={errors.description}>
            <textarea {...register('description')} rows={3} className="input resize-none"
              placeholder="What does this agent do?" />
          </F>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Selling price ($) — blank = free" error={errors.price}>
              <input {...register('price')} type="number" min={0} step="0.01" className="input" placeholder="0.00" />
            </F>
            <F label="Tags (comma-separated)">
              <input {...register('tags')} className="input" placeholder="seo, content, writing" />
            </F>
          </div>
        </div>

        {/* System instructions */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-base text-dark-950 mb-4">System Instructions</h2>
          <F error={errors.instructions}>
            <textarea
              {...register('instructions')}
              rows={8}
              className="input resize-none font-mono text-sm"
              placeholder="You are a content marketing specialist. Your role is to..."
            />
          </F>
          <p className="text-xs text-dark-700/40 mt-2">
            Instructions are hidden for paid agents unless purchased.
          </p>
        </div>

        {/* Responsibilities */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base text-dark-950">Responsibilities</h2>
            <button
              type="button"
              onClick={() => append({ value: '' })}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <Plus size={13} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  {...register(`responsibilities.${i}.value`)}
                  className="input flex-1"
                  placeholder={`Responsibility ${i + 1}`}
                />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="p-2 text-dark-700/40 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full justify-center py-3"
        >
          {mutation.isPending ? 'Creating…' : 'Create listing'}
        </button>
      </form>
    </div>
  )
}
