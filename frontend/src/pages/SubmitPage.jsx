import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import {
  Plus, Trash2, Upload, Eye, Edit3, GitFork, Star,
  Layers, FileArchive, Download, CheckCircle2, AlertTriangle,
  XCircle, X, ChevronDown, ChevronUp, Zap,
  Users, TrendingUp, Clock, ArrowRight, DollarSign,
} from 'lucide-react'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import { templateApi, analyzeApi } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import AgentGraph from '@/components/templates/AgentGraph'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Schemas ───────────────────────────────────────────────────────────────────

const agentSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  model: z.string().min(1),
  schedule: z.string().optional(),
  tier: z.enum(['Leadership', 'Operations', 'Execution']),
  responsibilities: z.string().optional(),
})

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  long_description: z.string().optional(),
  category: z.string().min(1),
  tags: z.string().optional(),
  goals: z.string().optional(),
  time_to_first_output: z.string().optional(),
  agent_count: z.coerce.number().int().min(1),
  monthly_cost: z.coerce.number().optional(),
  monthly_revenue_min: z.coerce.number().optional(),
  price: z.coerce.number().min(0).optional(),
  agents: z.array(agentSchema).optional(),
})

const CATEGORIES = ['Marketing', 'SaaS', 'E-commerce', 'Agency', 'Media', 'Finance', 'Other']
const MODELS     = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-4o', 'gpt-4o-mini']
const TIERS      = ['Leadership', 'Operations', 'Execution']

// ── ZIP parsing ───────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)/)
  if (!m) return { meta: {}, body: content.trim() }
  let meta = {}
  try {
    const raw = yamlLoad(m[1]) || {}
    // Normalise all keys to lowercase so "Category:" and "category:" both work
    Object.entries(raw).forEach(([k, v]) => { meta[k.toLowerCase()] = v })
  } catch { /* ignore malformed frontmatter */ }
  return { meta, body: m[2].trim() }
}

function parseCompanyMd(content) {
  const { meta, body } = parseFrontmatter(content)

  // ── Parse every ## section from the body ──────────────────────────────────
  // sections: [{ title: 'Goals', key: 'goals', text: '- ...' }, ...]
  const sections = []
  const secRe = /^##\s+(.+?)\s*$/gim
  let secMatch
  const sectionStarts = []
  while ((secMatch = secRe.exec(body)) !== null)
    sectionStarts.push({ title: secMatch[1].trim(), index: secMatch.index, end: secMatch.index + secMatch[0].length })

  sectionStarts.forEach((s, i) => {
    const textEnd = sectionStarts[i + 1]?.index ?? body.length
    sections.push({
      title: s.title,
      key:   s.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
      text:  body.slice(s.end).slice(0, textEnd - s.end).trim(),
    })
  })

  // Intro text = everything before the first ## heading
  const introText = sectionStarts.length ? body.slice(0, sectionStarts[0].index).trim() : body.trim()

  // ── Extract goals from any recognisable heading ───────────────────────────
  const GOAL_KEYS = ['goals', 'goal', 'objectives', 'objective', 'key goals', 'key results',
                     'what you get', 'outcomes', 'benefits', 'use cases', 'use case']
  const goalsSection = sections.find(s => GOAL_KEYS.some(k => s.key === k || s.key.startsWith(k)))

  const extractBullets = text =>
    text.split('\n')
      .map(l => l.replace(/^[\s*\-+•\d.]+/, '').trim())
      .filter(Boolean)

  const goals = goalsSection ? extractBullets(goalsSection.text) : []

  // ── Long description = intro + all non-goal sections ────────────────────
  const bodyForDesc = [
    introText,
    ...sections
      .filter(s => !GOAL_KEYS.some(k => s.key === k || s.key.startsWith(k)))
      .map(s => `## ${s.title}\n\n${s.text}`),
  ].filter(Boolean).join('\n\n').trim()

  // ── Frontmatter field resolution with aliases ─────────────────────────────
  const str  = (...keys) => { for (const k of keys) if (meta[k] != null) return String(meta[k]); return undefined }
  const num  = (...keys) => { for (const k of keys) if (meta[k] != null) return Number(meta[k]);  return undefined }
  const arr  = (...keys) => {
    for (const k of keys) {
      if (meta[k] == null) continue
      return Array.isArray(meta[k])
        ? meta[k].map(String)
        : String(meta[k]).split(',').map(t => t.trim()).filter(Boolean)
    }
    return undefined
  }

  const out = {}

  // Title — frontmatter → first # heading in body
  const h1 = body.match(/^#\s+(.+)/m)
  const title = str('title', 'name') ?? (h1 ? h1[1].trim() : undefined)
  if (title) out.title = title

  // Category — frontmatter aliases, then body section fallback (## Category / ## Industry / ...)
  const CATEGORY_SECTION_KEYS = ['category', 'industry', 'sector', 'vertical']
  const catSection = sections.find(s => CATEGORY_SECTION_KEYS.some(k => s.key === k || s.key.startsWith(k)))
  const cat = str('category', 'industry', 'sector', 'vertical')
    ?? (catSection ? catSection.text.trim().split('\n')[0].trim() : undefined)
  if (cat) out.category = cat

  // Description — frontmatter → first line of intro text
  const desc = str('description', 'subtitle', 'tagline', 'summary', 'short_description')
    ?? (introText ? introText.split('\n').find(l => l.trim() && !l.startsWith('#')) : undefined)
  if (desc) out.description = desc.trim()

  // Tags — frontmatter aliases, then body section fallback (## Tags / ## Keywords / ...)
  const TAG_SECTION_KEYS = ['tags', 'tag', 'keywords', 'keyword', 'labels', 'topics']
  const tagSection = sections.find(s => TAG_SECTION_KEYS.some(k => s.key === k || s.key.startsWith(k)))
  const tags = arr('tags', 'tag', 'keywords', 'labels')
    ?? (tagSection
      ? extractBullets(tagSection.text).map(t => t.toLowerCase().replace(/\s+/g, '-')).filter(Boolean)
      : undefined)
  if (tags?.length) out.tags = tags

  // Time to first output
  const ttfo = str('time_to_first_output', 'time_to_output', 'ttfo', 'first_output', 'time_to_value')
  if (ttfo) out.time_to_first_output = ttfo

  // Agent count
  const ac = num('agent_count', 'agents', 'num_agents', 'number_of_agents')
  if (ac != null && !isNaN(ac)) out.agent_count = ac

  // Costs
  const cost = num('monthly_cost', 'cost', 'price', 'pricing', 'monthly_price', 'cost_per_month')
  if (cost != null && !isNaN(cost)) out.monthly_cost = cost

  const revMin = num('monthly_revenue_min', 'revenue_min', 'revenue', 'monthly_revenue', 'min_revenue')
  if (revMin != null && !isNaN(revMin)) out.monthly_revenue_min = revMin

  const revMax = num('monthly_revenue_max', 'revenue_max', 'max_revenue')
  if (revMax != null && !isNaN(revMax)) out.monthly_revenue_max = revMax

  // Goals
  if (goals.length) out.goals = goals

  // Long description
  if (bodyForDesc) out.long_description = bodyForDesc

  return out
}

function validateZip(config, contents) {
  const errors = [], warnings = []
  if (!config.title) warnings.push('No title found — fill it in the form below')

  // Match flat (agents/name.md) AND subfolder (agents/name/file.md)
  const agentFiles = Object.keys(contents).filter(p =>
    /(?:^|\/)agents\/[^/]+\.md$/i.test(p) ||
    /(?:^|\/)agents\/[^/]+\/[^/]+\.md$/i.test(p),
  )
  const skillFiles = Object.keys(contents).filter(p =>
    /(?:^|\/)skills\/[^/]+\.md$/i.test(p) ||
    /(?:^|\/)skills\/[^/]+\/[^/]+\.md$/i.test(p),
  )

  // For subfolder layouts the id is the folder name, not the filename
  const agentIdFromPath = p => {
    const sub  = p.match(/(?:^|\/)agents\/([^/]+)\/[^/]+\.md$/i)
    const flat = p.match(/(?:^|\/)agents\/([^/]+)\.md$/i)
    return (sub || flat)?.[1] ?? null
  }

  ;(config.agents || []).forEach(a => {
    const id = a.id ?? (a.name ?? '').toLowerCase().replace(/\s+/g, '-')
    if (!agentFiles.some(p => agentIdFromPath(p) === id))
      warnings.push(`agents/${id}: no file found — agent will have no instructions`)
  })
  agentFiles.forEach(p => {
    const id = agentIdFromPath(p)
    if (!id) return
    if (!(config.agents || []).some(a => (a.id ?? '') === id || (a.name ?? '').toLowerCase().replace(/\s+/g, '-') === id))
      warnings.push(`agents/${id} has no matching config entry`)
  })

  return { errors, warnings, agentFileCount: agentFiles.length, skillFileCount: skillFiles.length }
}

async function parseZip(file) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)

  // Read every non-directory entry; skip binary / unreadable files gracefully
  const contents = {}
  await Promise.all(
    Object.entries(zip.files)
      .filter(([, f]) => !f.dir)
      .map(async ([path, f]) => {
        // Normalise separators; strip macOS noise folders
        const norm = path.replace(/\\/g, '/').replace(/^\/+/, '')
        if (norm.startsWith('__MACOSX/') || norm.includes('.DS_Store')) return
        try { contents[norm] = await f.async('text') } catch { /* skip binary */ }
      }),
  )

  const bn = p => p.split('/').pop()  // basename helper

  // ── Locate config (optional) ────────────────────────────────────────────
  // Primary: any file ending in .paperclip.yaml
  // Fallback: .paperclip (JSON), config.json, template.json
  const configKey = Object.keys(contents).find(k => bn(k).endsWith('.paperclip.yaml'))
                 ?? Object.keys(contents).find(k => bn(k) === '.paperclip')
                 ?? Object.keys(contents).find(k => bn(k) === 'config.json')
                 ?? Object.keys(contents).find(k => bn(k) === 'template.json')

  let config = {}
  let autoDetected = false

  if (configKey) {
    try {
      const raw = contents[configKey]
      config = bn(configKey).endsWith('.yaml') ? yamlLoad(raw) : JSON.parse(raw)
      if (!config || typeof config !== 'object') throw new Error('config is not an object')
    } catch (e) {
      throw new Error(`${bn(configKey)}: ${e.message}`)
    }
  } else {
    // No config file found — auto-build from folder contents
    autoDetected = true

    // README.md → title
    const readKey = Object.keys(contents).find(k => bn(k) === 'README.md')
    if (readKey) {
      const h = contents[readKey].match(/^#\s+(.+)/m)
      if (h) config.title = h[1].trim()
    }
  }

  // COMPANY.md → parse all metadata fields and body; fill any gap not set by .paperclip.yaml
  const compKey = Object.keys(contents).find(k => bn(k) === 'COMPANY.md')
  if (compKey) {
    const compData = parseCompanyMd(contents[compKey])
    Object.entries(compData).forEach(([k, v]) => {
      if (config[k] == null) config[k] = v
    })
  }

  // README.md → title / description last-resort fallback
  {
    const readKey2 = Object.keys(contents).find(k => bn(k) === 'README.md')
    if (readKey2) {
      const h = contents[readKey2].match(/^#\s+(.+)/m)
      if (h) {
        if (!config.title)       config.title       = h[1].trim()
        if (!config.description) config.description = h[1].trim()
      }
    }
  }

  // ── Parse agents/ — supports flat (agents/name.md) AND subfolder (agents/name/file.md) ──
  const AGENT_SUB_RE  = /(?:^|\/)agents\/([^/]+)\/[^/]+\.md$/i   // subfolder → use folder name
  const AGENT_FLAT_RE = /(?:^|\/)agents\/([^/]+)\.md$/i           // flat → use filename

  const _bullets = t => t.split('\n').map(l => l.replace(/^[\s*\-+•\d.]+/, '').trim()).filter(Boolean)
  const _bodySections = body => {
    const starts = []
    const re = /^##\s+(.+?)\s*$/gim
    let m
    while ((m = re.exec(body)) !== null) starts.push({ key: m[1].toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), index: m.index, end: m.index + m[0].length })
    return starts.map((s, i) => ({ key: s.key, text: body.slice(s.end, starts[i + 1]?.index ?? body.length).trim() }))
  }

  const pcAgents = Array.isArray(config.agents) ? config.agents : []
  const agentMap = {}
  pcAgents.forEach(a => {
    const id = a.id ?? (a.name ?? '').toLowerCase().replace(/\s+/g, '-')
    agentMap[id] = { ...a, id }
  })

  Object.entries(contents)
    .filter(([p]) => AGENT_SUB_RE.test(p) || AGENT_FLAT_RE.test(p))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([path, text]) => {
      const subM  = path.match(AGENT_SUB_RE)
      const flatM = path.match(AGENT_FLAT_RE)
      const fileId = (subM || flatM)[1]   // folder name for subfolder, filename for flat

      const { meta, body } = parseFrontmatter(text)
      const existing = agentMap[fileId] ?? {}
      const sections = _bodySections(body)

      // Model: frontmatter → HTML comment <!-- ... model: xxx --> → fallback
      const modelComment = text.match(/<!--[^>]*\bmodel:\s*([^\s|>\-]+)/)
      const model = meta.model
        || (modelComment ? modelComment[1].trim() : null)
        || existing.model
        || 'claude-sonnet-4-6'

      // Schedule: frontmatter schedule/triggers → "## What triggers you" body section
      const triggerSection = sections.find(s => s.key.startsWith('what triggers') || s.key === 'trigger' || s.key === 'triggers')
      const schedule = meta.schedule || meta.triggers
        || (triggerSection ? triggerSection.text.split('\n')[0].trim() : null)
        || existing.schedule || ''

      // Parent: meta.parent → meta.reportsto (reportsTo lowercased) → existing
      const rawParent = meta.parent ?? meta.reportsto ?? null
      const parent = (!rawParent || rawParent === 'null') ? null : rawParent

      // Responsibilities: frontmatter → "## What you do" body section
      const whatYouDo = sections.find(s => s.key.startsWith('what you do') || s.key === 'responsibilities')
      const responsibilities = Array.isArray(meta.responsibilities)
        ? meta.responsibilities.map(r => String(r).trim()).filter(Boolean)
        : meta.responsibilities
          ? String(meta.responsibilities).split(',').map(r => r.trim()).filter(Boolean)
          : whatYouDo ? _bullets(whatYouDo.text) : (existing.responsibilities || [])

      // skills list from frontmatter (used to pull instructions from skill files)
      const agentSkills = Array.isArray(meta.skills) ? meta.skills.map(String)
        : meta.skills ? String(meta.skills).split(',').map(s => s.trim()).filter(Boolean)
        : (existing.skills || [])

      agentMap[fileId] = {
        id:    meta.id    || existing.id    || fileId,
        name:  meta.name  || meta.title  || existing.name  || fileId,
        role:  meta.role  || meta.title  || existing.role  || '',
        model,
        tier:  meta.tier  || existing.tier  || 'Execution',
        schedule,
        parent: parent ?? existing.parent ?? null,
        responsibilities,
        skills: agentSkills,
        instructions: body || null,
        monthly_cost:        meta.monthly_cost        != null ? Number(meta.monthly_cost)        : existing.monthly_cost,
        monthly_revenue_min: meta.monthly_revenue_min != null ? Number(meta.monthly_revenue_min) : existing.monthly_revenue_min,
        monthly_revenue_max: meta.monthly_revenue_max != null ? Number(meta.monthly_revenue_max) : existing.monthly_revenue_max,
      }
    })
  pcAgents.forEach(a => {
    const id = a.id ?? (a.name ?? '').toLowerCase().replace(/\s+/g, '-')
    if (!agentMap[id]) agentMap[id] = { ...a, id, instructions: null }
  })
  config.agents = Object.values(agentMap)
  config.agent_count = config.agents.length || config.agent_count || 1

  // Aggregate per-agent cost/revenue into top-level config when not already set
  const _sumAgentField = (agents, key) => {
    const vals = agents.map(a => a[key]).filter(v => v != null && !isNaN(Number(v)))
    return vals.length ? vals.reduce((s, v) => s + Number(v), 0) : undefined
  }
  if (config.monthly_cost        == null) { const v = _sumAgentField(config.agents, 'monthly_cost');        if (v != null) config.monthly_cost        = v }
  if (config.monthly_revenue_min == null) { const v = _sumAgentField(config.agents, 'monthly_revenue_min'); if (v != null) config.monthly_revenue_min = v }
  if (config.monthly_revenue_max == null) { const v = _sumAgentField(config.agents, 'monthly_revenue_max'); if (v != null) config.monthly_revenue_max = v }

  // If auto-detected and nothing useful found, show a helpful error with file list
  if (autoDetected && config.agents.length === 0) {
    const found = Object.keys(contents).slice(0, 15).map(k => `  • ${k}`).join('\n')
    throw new Error(
      `No config file or agents/ folder found in this ZIP.\n\nExpected a file ending in .paperclip.yaml, or an agents/ folder with .md files.\n\nFiles found:\n${found || '  (no readable files)'}`,
    )
  }

  // ── Parse skills/ — supports flat (skills/name.md) AND subfolder (skills/name/file.md) ──
  const SKILL_SUB_RE  = /(?:^|\/)skills\/([^/]+)\/[^/]+\.md$/i
  const SKILL_FLAT_RE = /(?:^|\/)skills\/([^/]+)\.md$/i

  const pcSkills = Array.isArray(config.skills) ? config.skills : []
  const skillMap = {}
  pcSkills.forEach(s => {
    const id = s.id ?? (s.name ?? '').toLowerCase().replace(/\s+/g, '-')
    skillMap[id] = { ...s, id }
  })

  Object.entries(contents)
    .filter(([p]) => SKILL_SUB_RE.test(p) || SKILL_FLAT_RE.test(p))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([path, text]) => {
      const subM  = path.match(SKILL_SUB_RE)
      const flatM = path.match(SKILL_FLAT_RE)
      const fileId = (subM || flatM)[1]

      const { meta, body } = parseFrontmatter(text)
      const existing = skillMap[fileId] ?? {}
      skillMap[fileId] = {
        id: meta.id || existing.id || fileId,
        name: meta.name || meta.title || existing.name || fileId,
        description: meta.description || existing.description || body.split('\n').find(l => l.trim()) || '',
        instructions: body || null,
      }
    })
  config.skills = Object.values(skillMap)

  // Back-fill agent instructions from referenced skill files when agent body is empty
  config.agents = config.agents.map(agent => {
    if (agent.instructions) return agent
    const parts = (agent.skills || [])
      .map(sid => skillMap[sid])
      .filter(Boolean)
      .map(s => s.instructions || s.description)
      .filter(Boolean)
    return parts.length ? { ...agent, instructions: parts.join('\n\n') } : agent
  })

  const validation = validateZip(config, contents)
  if (autoDetected) {
    validation.warnings.unshift('No .paperclip.yaml config found — structure auto-detected from agents/ folder')
  }

  return { config, contents, fileCount: Object.keys(contents).length, validation }
}

async function parseJson(file) { return JSON.parse(await file.text()) }

// ── Sample ZIP ────────────────────────────────────────────────────────────────

// Minimal .paperclip.yaml — metadata + goals live in COMPANY.md,
// agent details live in agents/*.md, skill details in skills/*.md
const SAMPLE_PAPERCLIP = {
  version: '1.0',
}

const SAMPLE_COMPANY_MD = `---
title: Lead Gen Machine
category: Marketing
description: Automate outbound pipeline — 50 qualified leads/week with zero manual effort
tags: [lead-gen, outbound, automation]
time_to_first_output: "<5 min"
agent_count: 4
monthly_cost: 145
monthly_revenue_min: 2000
---

This template deploys four AI agents that research target accounts, craft personalised outreach, and track pipeline continuously — no human involvement required between weekly CEO reviews.

## Goals

- Generate 50 qualified leads per week with zero manual effort
- Achieve >8% email open rate across all sequences
- Book 5+ discovery calls per week from cold outreach
- Maintain a continuously-updated enriched lead database

## How it works

1. The **CEO** agent defines the ICP and reviews performance each week
2. The **Growth Lead** manages outreach campaigns and monitors metrics daily
3. The **Researcher** scrapes and enriches lead data every 4 hours
4. The **Copywriter** generates personalised email sequences for each new lead batch

## Configuration

Update the CEO agent's ICP criteria before running. Supply CRM API credentials via the \`crm-connector\` skill settings.`

const SAMPLE_AGENT_INSTRUCTIONS = {
  ceo:
`---
name: CEO
role: Strategic oversight
model: claude-sonnet-4-6
tier: Leadership
schedule: weekly
parent: null
responsibilities: Define ICP, Set revenue targets, Review weekly report
---

You are the CEO agent responsible for strategic oversight of the Lead Gen Machine.

Each week you will:
- Review the performance report from the Growth Lead
- Refine the Ideal Customer Profile (ICP) based on win/loss data
- Adjust revenue targets if pipeline coverage drops below 3×

Decision rules:
- If reply rate < 2%: instruct Growth Lead to run a new messaging A/B test
- If no meetings booked in 7 days: escalate ICP and notify operator`,

  'growth-lead':
`---
name: Growth Lead
role: Campaign manager
model: claude-sonnet-4-6
tier: Operations
schedule: daily
parent: ceo
responsibilities: Plan outreach sequences, Monitor reply rates, A/B test messaging
---

You are the Growth Lead responsible for all outbound campaign operations.

Daily tasks:
1. Pull the latest enriched leads from the Researcher
2. Queue personalised 3-touch email sequences (day 1 / 3 / 5 cadence)
3. Review previous day reply rates; flag any >2% drop to the CEO

Output format: JSON → { leads_queued, emails_sent, reply_rate, meetings_booked }`,

  researcher:
`---
name: Researcher
role: Account researcher
model: claude-haiku-4-5
tier: Execution
schedule: every 4h
parent: growth-lead
responsibilities: Scrape company data, Enrich contact info, Score leads
---

You are the Researcher agent. Run every 4 hours against the pending leads queue.

For each company record:
1. Identify the primary decision-maker (VP/Director/Head of target function)
2. Extract: company size, tech stack, funding stage, recent news
3. Score 1–10 against the current ICP
4. Write enriched record to outreach queue

Return only JSON records — no commentary.`,

  copywriter:
`---
name: Copywriter
role: Email copywriter
model: claude-haiku-4-5
tier: Execution
schedule: every 4h
parent: growth-lead
responsibilities: Write personalised emails, Generate follow-up sequences
---

You are the Copywriter agent. Run every 4 hours against newly enriched leads.

Rules:
- Email 1: personalised opener + value prop + soft CTA
- Email 2 (day 3): follow-up with case study or social proof
- Email 3 (day 5): break-up email with easy opt-out

≤120 words per email. Peer-to-peer tone. No buzzwords.`,
}

const SAMPLE_SKILL_INSTRUCTIONS = {
  'web-search':
`---
name: Web Search
description: Search the web for company, person, and market data
---

Params: query (string), max_results (int=10)
Returns: [{ title, url, snippet }]`,

  'email-sender':
`---
name: Email Sender
description: Send transactional emails via SMTP
---

Params: to, subject, body (HTML/text), reply_to?
Returns: { message_id, status }`,

  'crm-connector':
`---
name: CRM Connector
description: Read/write CRM records for contacts, activities, and deals
---

Methods: find_contact(email), create_contact(data), log_activity(id, type, notes), update_deal_stage(id, stage)`,
}

async function downloadSampleZip() {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('template.paperclip.yaml', yamlDump(SAMPLE_PAPERCLIP, { lineWidth: 120, quotingType: '"' }))
  zip.file('COMPANY.md', SAMPLE_COMPANY_MD)
  zip.file('README.md', '# Lead Gen Machine\n\nSee COMPANY.md for the full description.')
  zip.file('LICENSE', 'MIT License\n\nCopyright (c) 2025 SAKAgentMart')
  const agents = zip.folder('agents')
  Object.entries(SAMPLE_AGENT_INSTRUCTIONS).forEach(([id, t]) => agents.file(`${id}.md`, t))
  const skills = zip.folder('skills')
  Object.entries(SAMPLE_SKILL_INSTRUCTIONS).forEach(([id, t]) => skills.file(`${id}.md`, t))
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: 'template-sample.zip' })
  a.click()
  URL.revokeObjectURL(url)
}

// ── Validation banner ─────────────────────────────────────────────────────────

function ValidationBanner({ validation, filename, onDismiss }) {
  const { errors, warnings, agentFileCount, skillFileCount } = validation
  const hasIssues = errors.length + warnings.length > 0
  const tone = errors.length ? 'red' : warnings.length ? 'amber' : 'emerald'
  const toneMap = {
    red:     { wrap: 'bg-red-50 border-red-200',       icon: <XCircle size={16} className="text-red-500" />,          title: 'text-red-800',   body: 'text-red-700'    },
    amber:   { wrap: 'bg-amber-50 border-amber-200',   icon: <AlertTriangle size={16} className="text-amber-500" />,   title: 'text-amber-800', body: 'text-amber-700'  },
    emerald: { wrap: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={16} className="text-emerald-600" />, title: 'text-emerald-800', body: 'text-emerald-700' },
  }
  const t = toneMap[tone]
  return (
    <div className={clsx('rounded-lg border px-4 py-3 mb-4', t.wrap)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{t.icon}</span>
        <div className="flex-1 min-w-0 text-sm">
          <p className={clsx('font-semibold', t.title)}>{filename}</p>
          <p className={clsx('text-xs mt-0.5', t.body)}>
            {agentFileCount} agent file{agentFileCount !== 1 ? 's' : ''}
            {skillFileCount > 0 && ` · ${skillFileCount} skill file${skillFileCount !== 1 ? 's' : ''}`}
            {!hasIssues && ' · all files validated ✓'}
          </p>
          {hasIssues && (
            <ul className="mt-2 space-y-0.5">
              {errors.map((e, i)   => <li key={i} className={clsx('text-xs flex items-start gap-1.5', t.body)}><XCircle size={11} className="mt-0.5 shrink-0" />{e}</li>)}
              {warnings.map((w, i) => <li key={i} className={clsx('text-xs flex items-start gap-1.5', t.body)}><AlertTriangle size={11} className="mt-0.5 shrink-0" />{w}</li>)}
            </ul>
          )}
        </div>
        <button type="button" onClick={onDismiss} className="opacity-40 hover:opacity-70 shrink-0"><X size={14} /></button>
      </div>
    </div>
  )
}

// ── Skill expand card (Edit tab) ──────────────────────────────────────────────

function SkillCard({ skill }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Zap size={13} className="text-accent-500 shrink-0" />
            <p className="font-semibold text-sm text-dark-950 truncate">{skill.name}</p>
          </div>
          {skill.description && <p className="text-xs text-dark-700/60 pl-[18px]">{skill.description}</p>}
        </div>
        {skill.instructions && (
          <button type="button" onClick={() => setOpen(v => !v)} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 shrink-0">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {open ? 'Hide' : 'View'}
          </button>
        )}
      </div>
      {open && skill.instructions && (
        <pre className="mt-3 text-xs bg-surface-soft rounded-md p-3 whitespace-pre-wrap font-mono text-dark-700/80 max-h-48 overflow-y-auto leading-relaxed border border-surface-border">
          {skill.instructions}
        </pre>
      )}
    </div>
  )
}

// ── Preview components ────────────────────────────────────────────────────────

const TIER_BORDER = {
  Leadership: 'border-l-violet-400',
  Operations:  'border-l-primary-400',
  Execution:   'border-l-accent-400',
}

function AgentRosterCard({ agent }) {
  return (
    <div className={clsx('card border-l-4 p-4', TIER_BORDER[agent.tier] ?? 'border-l-slate-300')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-dark-950 truncate">{agent.name}</p>
          {agent.role && <p className="text-xs text-dark-700/60 mt-0.5">{agent.role}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {agent.model && <span className="badge badge-gray text-[11px]">{agent.model}</span>}
          {agent.schedule && <span className="badge badge-blue text-[11px]">{agent.schedule}</span>}
        </div>
      </div>
      {agent.responsibilities?.length > 0 && (
        <ul className="mt-2.5 space-y-0.5">
          {agent.responsibilities.map((r, i) => (
            <li key={i} className="text-xs text-dark-700/60 flex items-start gap-1.5">
              <span className="text-primary-400 mt-0.5 shrink-0">·</span>{r}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MetricCell({ icon: Icon, label, value, highlight, last }) {
  return (
    <div className={clsx('flex-1 flex flex-col items-center py-4 px-3 bg-white', !last && 'border-r border-surface-border')}>
      <Icon size={15} className={clsx('mb-1', highlight ? 'text-emerald-500' : 'text-primary-400')} />
      <p className={clsx('font-display font-bold text-lg leading-none', highlight ? 'text-emerald-600' : 'text-dark-950')}>
        {value}
      </p>
      <p className="text-xs text-dark-700/50 mt-0.5">{label}</p>
    </div>
  )
}

function toPreviewData(v) {
  const agents = (v.agents || []).map((a, i) => ({
    id: i,
    name: a.name || '',
    role: a.role || '',
    model: a.model || '',
    tier: a.tier || 'Execution',
    schedule: a.schedule || '',
    responsibilities: a.responsibilities ? a.responsibilities.split('\n').filter(Boolean) : [],
  }))
  return {
    title:               v.title || 'Untitled Template',
    description:         v.description || '',
    long_description:    v.long_description || '',
    category:            v.category || 'Other',
    tags:                v.tags ? v.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    goals:               v.goals ? v.goals.split('\n').filter(Boolean) : [],
    time_to_first_output: v.time_to_first_output || null,
    agent_count:         Number(v.agent_count) || agents.length || 1,
    monthly_cost:        v.monthly_cost ? Number(v.monthly_cost) * 100 : null,
    monthly_revenue_min: v.monthly_revenue_min ? Number(v.monthly_revenue_min) * 100 : null,
    price:               v.price ? Math.round(Number(v.price) * 100) : null,
    agents,
  }
}

function TemplatePreview({ template, graphAgents, skills, onEdit, onSubmit, isSubmitting }) {
  const fmt = c => (c ? `$${(c / 100).toLocaleString()}` : '—')

  const metrics = [
    { icon: Users,      label: 'Agents',       value: template.agent_count,                              show: true },
    { icon: DollarSign, label: 'Est. cost/mo',  value: fmt(template.monthly_cost),                       show: !!template.monthly_cost },
    { icon: TrendingUp, label: 'Est. revenue',  value: `${fmt(template.monthly_revenue_min)}+`,           show: !!template.monthly_revenue_min, highlight: true },
    { icon: Clock,      label: 'First output',  value: template.time_to_first_output,                    show: !!template.time_to_first_output },
  ].filter(m => m.show)

  return (
    <div>
      {/* Draft banner */}
      <div className="flex items-center justify-between mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
          Draft Preview — not yet published
        </span>
        <button type="button" onClick={onEdit} className="btn-outline text-sm">
          <Edit3 size={14} /> Edit
        </button>
      </div>

      {/* Hero */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="badge badge-blue">{template.category}</span>
          <span className="badge badge-gray">Draft</span>
        </div>
        <h1 className="font-display font-bold text-4xl text-dark-950 tracking-tight leading-tight mb-2">
          {template.title}
        </h1>
        {template.description && (
          <p className="text-xl text-dark-700/70 font-medium leading-snug mb-3">{template.description}</p>
        )}
        {template.long_description && (
          <p className="text-dark-700/60 leading-relaxed text-sm whitespace-pre-wrap">
            {template.long_description}
          </p>
        )}
      </div>

      {/* Metrics strip */}
      {metrics.length > 0 && (
        <div className="flex items-stretch rounded-lg border border-surface-border overflow-hidden mb-8">
          {metrics.map((m, i) => (
            <MetricCell key={m.label} {...m} last={i === metrics.length - 1} />
          ))}
        </div>
      )}

      {/* Tags row */}
      {template.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-8">
          {template.tags.map(t => (
            <span key={t} className="badge badge-gray">#{t}</span>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Main (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Agent roster */}
          {template.agents.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-lg text-dark-950 mb-3">Agent Roster</h2>
              <div className="space-y-3">
                {template.agents.map(agent => (
                  <AgentRosterCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          )}

          {/* Agent hierarchy graph */}
          {graphAgents?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
                <Layers size={16} className="text-primary-500" />
                Agent Hierarchy
                <span className="text-xs font-normal text-dark-700/40 ml-1">parent → child</span>
              </h2>
              <AgentGraph agents={graphAgents} />
            </div>
          )}

          {/* Goals */}
          {template.goals.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg text-dark-950 mb-4">Goals</h2>
              <ul className="space-y-3">
                {template.goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <ArrowRight size={15} className="text-primary-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-dark-700/80 leading-snug">{goal}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {skills?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg text-dark-950 mb-3 flex items-center gap-2">
                <Zap size={16} className="text-accent-500" /> Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s.id} className="badge badge-orange">
                    <Zap size={10} /> {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar (1/3) ── */}
        <div className="space-y-4">
          <div className="card p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { Icon: GitFork, label: 'Forks', v: 0 },
                { Icon: Star,    label: 'Stars', v: 0 },
                { Icon: Eye,     label: 'Views', v: 0 },
              ].map(({ Icon, label, v }) => (
                <div key={label} className="text-center">
                  <Icon size={16} className="text-primary-400 mx-auto mb-1" />
                  <p className="font-display font-bold text-xl text-dark-950">{v}</p>
                  <p className="text-xs text-dark-700/50">{label}</p>
                </div>
              ))}
            </div>

            {/* Economics */}
            <div className="bg-surface-soft rounded-lg p-4 mb-5 space-y-2">
              <Row label="Agents" value={template.agent_count} />
              {template.monthly_cost     && <Row label="Est. cost/mo"  value={fmt(template.monthly_cost)} />}
              {template.monthly_revenue_min && (
                <Row label="Est. revenue" value={`${fmt(template.monthly_revenue_min)}+`} green />
              )}
              {template.time_to_first_output && (
                <Row label="First output" value={template.time_to_first_output} />
              )}
            </div>

            {/* Actions */}
            <button type="button" onClick={onSubmit} disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
              <GitFork size={15} />{isSubmitting ? 'Submitting…' : 'Submit template'}
            </button>
            <button type="button" onClick={onEdit} className="btn-ghost w-full justify-center mt-2 text-sm">
              <Edit3 size={14} /> Back to edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, green }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-dark-700/60">{label}</span>
      <span className={clsx('font-semibold', green && 'text-emerald-600')}>{value}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const BLANK_AGENT = { name: '', role: '', model: 'claude-sonnet-4-6', tier: 'Execution', schedule: '', responsibilities: '' }

export default function SubmitPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [tab, setTab]                 = useState('edit')
  const [isDragging, setIsDragging]   = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [aiLoading, setAiLoading]     = useState(false)
  const [graphAgents, setGraphAgents] = useState(null)
  const [skills, setSkills]           = useState(null)

  const [newAgent, setNewAgent] = useState(BLANK_AGENT)

  const fileRef = useRef(null)

  const { register, handleSubmit, control, formState: { errors }, setValue, getValues } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { agents: [], agent_count: 1, category: 'SaaS' },
  })
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'agents' })
  const watched = useWatch({ control })

  const mutation = useMutation({
    mutationFn: data => templateApi.create(data),
    onSuccess: t => { toast.success('Template submitted!'); navigate(`/templates/${t.slug}`) },
    onError: () => toast.error('Submission failed'),
  })

  const onSubmit = ({ goals, time_to_first_output, ...values }) => {
    const config_schema = {}
    if (goals)                config_schema.goals               = goals.split('\n').filter(Boolean)
    if (time_to_first_output) config_schema.time_to_first_output = time_to_first_output
    if (skills?.length)       config_schema.skills              = skills

    const agents = (values.agents || []).map((a, i) => ({
      ...a, position: i,
      responsibilities: a.responsibilities ? a.responsibilities.split('\n').filter(Boolean) : [],
      parent_name: graphAgents?.find(g => g.name === a.name)?.parent || null,
    }))
    mutation.mutate({
      ...values,
      config_schema,
      tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      monthly_cost: values.monthly_cost ? values.monthly_cost * 100 : undefined,
      monthly_revenue_min: values.monthly_revenue_min ? values.monthly_revenue_min * 100 : undefined,
      agents,
    })
  }

  const applyConfig = useCallback((config, filename, validation, mergeOnly = false) => {
    const cur = mergeOnly ? getValues() : {}
    const set = (field, val) => {
      if (!mergeOnly || !cur[field]) setValue(field, val, { shouldDirty: true })
    }

    if (config.title)               set('title', config.title)
    if (config.description)         set('description', config.description)
    if (config.long_description)    set('long_description', config.long_description)
    if (config.category) {
      // case-insensitive match; fall back to 'Other' rather than silently drop
      const matched = CATEGORIES.find(c => c.toLowerCase() === String(config.category).toLowerCase())
      set('category', matched ?? 'Other')
    }
    if (config.agent_count)         set('agent_count', Number(config.agent_count))
    if (config.monthly_cost)        set('monthly_cost', Number(config.monthly_cost))
    if (config.monthly_revenue_min) set('monthly_revenue_min', Number(config.monthly_revenue_min))
    if (config.time_to_first_output) set('time_to_first_output', config.time_to_first_output)
    if (config.tags)  set('tags',  Array.isArray(config.tags)  ? config.tags.join(', ')   : config.tags)
    if (config.goals) set('goals', Array.isArray(config.goals) ? config.goals.join('\n')  : config.goals)

    const rawAgents = Array.isArray(config.agents) ? config.agents : []
    if (rawAgents.length && (!mergeOnly || !cur.agents?.length)) {
      // use replace() — setValue('agents',[...]) bypasses useFieldArray's internal state
      replace(rawAgents.map(a => ({
        name:  a.name  || '',
        role:  a.role  || '',
        model: MODELS.includes(a.model) ? a.model : 'claude-sonnet-4-6',
        tier:  TIERS.includes(a.tier)   ? a.tier  : 'Execution',
        schedule: a.schedule || '',
        responsibilities: Array.isArray(a.responsibilities) ? a.responsibilities.join('\n') : (a.responsibilities || ''),
      })))
      setGraphAgents(rawAgents.map(a => ({
        id: a.id ?? a.name, name: a.name || '', role: a.role || '',
        model: a.model || '', tier: a.tier || 'Execution', schedule: a.schedule || '',
        parent: a.parent ?? null,
        responsibilities: Array.isArray(a.responsibilities) ? a.responsibilities : [],
        instructions: a.instructions ?? null,
      })))
    }

    if (!mergeOnly) {
      setSkills(Array.isArray(config.skills) ? config.skills : [])
      setParseResult({ filename, validation })
      toast.success(`"${config.title || 'Template'}" loaded`)
    }
  }, [setValue, getValues, replace])

  const handleFile = useCallback(async file => {
    if (!file) return
    setUploadError(null)
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const { config, contents, validation } = await parseZip(file)
        applyConfig(config, file.name, validation)

        // ── AI enrichment: backend reads COMPANY.md + agents/ + skills/ from the zip ──
        setAiLoading(true)
        try {
          const ai = await analyzeApi.template(file)
          // Merge AI data only for fields still empty in the form
          applyConfig(ai, file.name, validation, /* mergeOnly */ true)
          toast.success('AI enrichment applied')
        } catch {
          // AI enrichment is best-effort — don't block the user
        } finally {
          setAiLoading(false)
        }
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const config = await parseJson(file)
        applyConfig(config, file.name, { errors: [], warnings: [], agentFileCount: 0, skillFileCount: 0 })
      } else {
        setUploadError('Please upload a .zip or .json file')
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to parse file')
    }
  }, [applyConfig])

  const onDrop = useCallback(e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }, [handleFile])

  if (!user) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-dark-700/60 mb-4">You must be logged in to submit a template.</p>
      <a href="/login" className="btn-primary">Log in</a>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-accent-500 font-semibold text-sm uppercase tracking-wider mb-1">Contribute</p>
        <h1 className="font-display font-bold text-3xl text-dark-950">Submit a Template</h1>
        <p className="text-dark-700/60 mt-1.5">Share your agentic company setup with the community.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-soft rounded-lg border border-surface-border mb-6 w-fit">
        {[{ id: 'edit', label: 'Edit', Icon: Edit3 }, { id: 'preview', label: 'Preview', Icon: Eye }].map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all',
              tab === id ? 'bg-white text-dark-950 shadow-sm' : 'text-dark-700/60 hover:text-dark-950')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Edit tab ─────────────────────────────────────────────────────────── */}
      {tab === 'edit' && (
        <>
          {/* Upload zone */}
          <div
            className={clsx('border-2 border-dashed rounded-lg p-7 text-center mb-5 transition-colors cursor-pointer select-none',
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-surface-border bg-white hover:border-primary-300 hover:bg-primary-50/40')}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".zip,.json" className="hidden"
              onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
            <FileArchive size={30} className="mx-auto mb-3 text-primary-400" />
            <p className="text-sm font-medium text-dark-950 mb-2">
              Drop a <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded">.zip</code> or <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded">.json</code>, or click to browse
            </p>
            <div className="inline-block text-left bg-surface-soft border border-surface-border rounded-md px-4 py-2 mb-4 text-xs text-dark-700/60 font-mono leading-relaxed">
              <span className="text-primary-500">name.paperclip.yaml</span>{'  '}<span className="text-dark-700/30">← YAML config (optional)</span><br />
              <span className="text-dark-700/40">COMPANY.md{'         '}</span>← long description<br />
              <span className="text-dark-700/40">agents/{'            '}</span>← <span className="text-violet-500">*.md</span> agent instructions<br />
              <span className="text-dark-700/40">skills/{'            '}</span>← <span className="text-accent-500">*.md</span> skill instructions
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className="btn-outline text-xs py-1.5 pointer-events-none"><Upload size={13} /> Upload file</span>
              <button type="button" onClick={e => { e.stopPropagation(); downloadSampleZip() }}
                className="inline-flex items-center gap-1.5 text-xs text-dark-700/60 hover:text-primary-500 transition-colors">
                <Download size={13} /> Download sample ZIP
              </button>
            </div>
          </div>

          {/* AI enrichment loading indicator */}
          {aiLoading && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 flex items-center gap-3 text-sm text-primary-700">
              <svg className="animate-spin h-4 w-4 text-primary-500 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Gemini is analysing your template and filling missing fields…
            </div>
          )}

          {/* Upload error (shown inline so multiline file lists are readable) */}
          {uploadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2.5">
                <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-700 mb-1">Failed to parse file</p>
                  <pre className="text-xs text-red-600/80 whitespace-pre-wrap font-mono leading-relaxed">{uploadError}</pre>
                </div>
                <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 shrink-0" aria-label="Dismiss">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Validation banner */}
          {parseResult && (
            <ValidationBanner validation={parseResult.validation} filename={parseResult.filename}
              onDismiss={() => { setParseResult(null); setGraphAgents(null); setSkills(null) }} />
          )}

          {/* Agent graph */}
          {graphAgents?.length > 0 && (
            <div className="card p-5 mb-5">
              <h2 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
                <Layers size={16} className="text-primary-500" />
                Agent Graph
                <span className="text-xs font-normal text-dark-700/40 ml-1">parent → child hierarchy</span>
              </h2>
              <AgentGraph agents={graphAgents} />
            </div>
          )}

          {/* Skills */}
          {skills?.length > 0 && (
            <div className="card p-5 mb-5">
              <h2 className="font-display font-semibold text-base mb-3 flex items-center gap-2">
                <Zap size={16} className="text-accent-500" /> Skills
                <span className="text-xs font-normal text-dark-700/40 ml-1">{skills.length} from skills/</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {skills.map(s => <SkillCard key={s.id} skill={s} />)}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="card p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg">Template details</h2>
              <F label="Title *" error={errors.title}>
                <input {...register('title')} className="input" placeholder="Lead Gen Machine" />
              </F>
              <F label="Category *" error={errors.category}>
                <select {...register('category')} className="input">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </F>
              <F label="Short description" error={errors.description}>
                <input {...register('description')} className="input" placeholder="Bookkeeping & pipeline — 10× faster" />
              </F>
              <F label="Full description  (COMPANY.md)" error={errors.long_description}>
                <textarea {...register('long_description')} rows={4} className="input resize-none"
                  placeholder="Explain what the template does, who it's for, and how to configure it." />
              </F>
              <F label="Goals (one per line)">
                <textarea {...register('goals')} rows={3} className="input resize-none text-sm"
                  placeholder={'Generate 50 leads/week\nAchieve >8% open rate'} />
              </F>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Tags (comma-separated)">
                  <input {...register('tags')} className="input" placeholder="lead-gen, outbound" />
                </F>
                <F label="Time to first output">
                  <input {...register('time_to_first_output')} className="input" placeholder="<5 min" />
                </F>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Agent count *" error={errors.agent_count}>
                  <input {...register('agent_count')} type="number" min={1} className="input" />
                </F>
                <F label="Selling price ($) — leave blank for free" error={errors.price}>
                  <input {...register('price')} type="number" min={0} step="0.01" className="input" placeholder="0.00 = Free" />
                </F>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Est. cost/mo ($)" error={errors.monthly_cost}>
                  <input {...register('monthly_cost')} type="number" className="input" placeholder="145" />
                </F>
                <F label="Est. revenue/mo ($)" error={errors.monthly_revenue_min}>
                  <input {...register('monthly_revenue_min')} type="number" className="input" placeholder="2000" />
                </F>
              </div>
            </div>

            <div className="card p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg">Agents</h2>

              {/* ── Creation form ── */}
              <div className="border border-surface-border rounded-lg p-4 bg-surface-soft/30 space-y-3">
                <p className="text-xs font-semibold text-dark-700/50 uppercase tracking-wide">Add agent</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <F label="Name">
                    <input value={newAgent.name} onChange={e => setNewAgent(p => ({ ...p, name: e.target.value }))}
                      className="input" placeholder="CEO" />
                  </F>
                  <F label="Role">
                    <input value={newAgent.role} onChange={e => setNewAgent(p => ({ ...p, role: e.target.value }))}
                      className="input" placeholder="Strategic oversight" />
                  </F>
                  <F label="Tier">
                    <select value={newAgent.tier} onChange={e => setNewAgent(p => ({ ...p, tier: e.target.value }))} className="input">
                      {TIERS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </F>
                  <F label="Model">
                    <select value={newAgent.model} onChange={e => setNewAgent(p => ({ ...p, model: e.target.value }))} className="input">
                      {MODELS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </F>
                  <F label="Schedule">
                    <input value={newAgent.schedule} onChange={e => setNewAgent(p => ({ ...p, schedule: e.target.value }))}
                      className="input" placeholder="daily" />
                  </F>
                </div>
                <F label="Responsibilities (one per line)">
                  <textarea value={newAgent.responsibilities}
                    onChange={e => setNewAgent(p => ({ ...p, responsibilities: e.target.value }))}
                    rows={2} className="input resize-none text-sm"
                    placeholder={'Define ICP\nSet revenue targets'} />
                </F>
                <button type="button"
                  disabled={!newAgent.name.trim()}
                  onClick={() => { append(newAgent); setNewAgent(BLANK_AGENT) }}
                  className="btn-primary text-sm">
                  <Plus size={14} /> Add agent
                </button>
              </div>

              {/* ── Agents table ── */}
              {fields.length === 0 ? (
                <p className="text-sm text-dark-700/40 text-center py-4">No agents yet — upload a .zip or add one above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[660px] border border-surface-border rounded-lg overflow-hidden">
                    <thead className="bg-surface-soft">
                      <tr className="border-b border-surface-border">
                        {['#', 'Name', 'Role', 'Tier', 'Model', 'Schedule', 'Responsibilities', ''].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-dark-700/50 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {fields.map((field, i) => (
                        <tr key={field.id} className="group hover:bg-surface-soft/40 transition-colors">
                          <td className="py-2 px-3 text-xs text-dark-700/40 font-mono w-6">{i + 1}</td>
                          <td className="py-2 px-3 font-medium text-dark-950 whitespace-nowrap">
                            <input {...register(`agents.${i}.name`)} className="input text-sm w-full min-w-[80px]" />
                          </td>
                          <td className="py-2 px-3 text-dark-700/70">
                            <input {...register(`agents.${i}.role`)} className="input text-sm w-full min-w-[120px]" />
                          </td>
                          <td className="py-2 px-3">
                            <select {...register(`agents.${i}.tier`)} className="input text-xs">
                              {TIERS.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select {...register(`agents.${i}.model`)} className="input text-xs">
                              {MODELS.map(m => <option key={m}>{m}</option>)}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input {...register(`agents.${i}.schedule`)} className="input text-xs w-20" placeholder="—" />
                          </td>
                          <td className="py-2 px-3 max-w-[200px]">
                            <textarea {...register(`agents.${i}.responsibilities`)} rows={1}
                              className="input text-xs resize-none w-full" />
                          </td>
                          <td className="py-2 px-3 w-8">
                            <button type="button" onClick={() => remove(i)}
                              className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-dark-700/40 mt-2">{fields.length} agent{fields.length !== 1 ? 's' : ''} total</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setTab('preview')} className="btn-outline flex-1 justify-center py-3">
                <Eye size={16} /> Preview
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center py-3 text-base">
                {mutation.isPending ? 'Submitting…' : 'Submit template'}
              </button>
            </div>
          </form>
        </>
      )}

      {/* ── Preview tab ───────────────────────────────────────────────────────── */}
      {tab === 'preview' && (
        <TemplatePreview
          template={toPreviewData(watched)}
          graphAgents={graphAgents}
          skills={skills}
          onEdit={() => setTab('edit')}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={mutation.isPending}
        />
      )}
    </div>
  )
}

function F({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  )
}
