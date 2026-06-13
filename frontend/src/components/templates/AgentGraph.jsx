import { useState } from 'react'
import clsx from 'clsx'

// ── Layout constants ──────────────────────────────────────────────────────────

const NW = 168   // node width
const NH = 86    // node height
const HG = 40    // horizontal gap between siblings
const VG = 76    // vertical gap between levels
const PD = 24    // canvas padding

// ── Tier colours ──────────────────────────────────────────────────────────────

const TIER = {
  Leadership: { bg: '#f5f3ff', border: '#c4b5fd', name: '#5b21b6', dot: '#7c3aed' },
  Operations:  { bg: '#eff6ff', border: '#bfdbfe', name: '#1e40af', dot: '#3b82f6' },
  Execution:   { bg: '#fff7ed', border: '#fed7aa', name: '#c2410c', dot: '#f97316' },
}
const FALLBACK = TIER.Execution
function ts(tier) { return TIER[tier] ?? FALLBACK }

// ── Tree layout helpers ───────────────────────────────────────────────────────

/**
 * If no agent has an explicit `parent` field, infer connections from tier order:
 *   Leadership → Operations → Execution
 * Distributes children evenly across the parent tier.
 */
function inferParents(agents) {
  const hasExplicit = agents.some(a => a.parent != null)
  if (hasExplicit) return agents.map(a => ({ ...a, id: a.id ?? a.name }))

  const byTier = { Leadership: [], Operations: [], Execution: [] }
  agents.forEach(a => {
    const tier = a.tier ?? 'Execution'
    ;(byTier[tier] ?? byTier.Execution).push(a.id ?? a.name)
  })

  return agents.map(a => {
    const id = a.id ?? a.name
    const tier = a.tier ?? 'Execution'
    const idxInTier = (byTier[tier] ?? byTier.Execution).indexOf(id)
    let parent = null

    if (tier === 'Operations' && byTier.Leadership.length) {
      parent = byTier.Leadership[idxInTier % byTier.Leadership.length]
    } else if (tier === 'Execution') {
      const pool = byTier.Operations.length ? byTier.Operations : byTier.Leadership
      if (pool.length) parent = pool[idxInTier % pool.length]
    }
    return { ...a, id, parent }
  })
}

/**
 * Compute pixel positions for every node using a centered layered layout.
 * Returns: { nodes, pos, edges, svgW, svgH }
 */
function computeLayout(agents) {
  if (!agents.length) return { nodes: {}, pos: {}, edges: [], svgW: 300, svgH: 200 }

  const norm = inferParents(agents)

  // Build adjacency
  const byId = {}
  norm.forEach(a => { byId[a.id] = { ...a, _kids: [] } })
  const roots = []
  norm.forEach(a => {
    if (a.parent && byId[a.parent]) byId[a.parent]._kids.push(a.id)
    else roots.push(a.id)
  })

  // BFS → assign levels
  const levels = []
  const seen = new Set()
  const queue = roots.map(id => ({ id, lvl: 0 }))
  while (queue.length) {
    const { id, lvl } = queue.shift()
    if (seen.has(id)) continue
    seen.add(id)
    if (!levels[lvl]) levels[lvl] = []
    levels[lvl].push(id)
    byId[id]._kids.forEach(kid => queue.push({ id: kid, lvl: lvl + 1 }))
  }

  // Canvas width = widest level
  const maxLvlW = Math.max(
    ...levels.map(l => l.length * NW + (l.length - 1) * HG),
    NW,
  )

  // Assign x/y — centre each level
  const pos = {}
  levels.forEach((lvl, li) => {
    const w = lvl.length * NW + (lvl.length - 1) * HG
    const ox = (maxLvlW - w) / 2
    lvl.forEach((id, ni) => {
      pos[id] = {
        x: ox + ni * (NW + HG),
        y: li * (NH + VG),
      }
    })
  })

  // Build edge list
  const edges = []
  norm.forEach(a => {
    if (a.parent && byId[a.parent] && pos[a.id] && pos[a.parent]) {
      edges.push({ from: a.parent, to: a.id })
    }
  })

  return {
    nodes: byId,
    pos,
    edges,
    svgW: maxLvlW + PD * 2,
    svgH: levels.length * (NH + VG) - VG + PD * 2,
  }
}

// ── Agent detail panel ────────────────────────────────────────────────────────

function AgentDetail({ agent, onClose }) {
  const s = ts(agent.tier)
  return (
    <div className="card p-5 mt-3 animate-[fadeIn_150ms_ease]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0"
              style={{ background: s.bg, color: s.name, border: `1px solid ${s.border}` }}
            >
              {agent.tier}
            </span>
            <span className="font-bold text-dark-950 truncate">{agent.name}</span>
          </div>
          <p className="text-sm text-dark-700/70">{agent.role}</p>
          {(agent.model || agent.schedule) && (
            <p className="text-xs text-dark-700/40 mt-0.5">
              {[agent.model, agent.schedule].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-dark-700/30 hover:text-dark-700/60 p-1 rounded shrink-0"
        >
          ✕
        </button>
      </div>

      {agent.responsibilities?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-dark-700/50 uppercase tracking-wider mb-1.5">
            Responsibilities
          </p>
          <ul className="space-y-1">
            {agent.responsibilities.map((r, i) => (
              <li key={i} className="text-xs text-dark-700/70 flex items-start gap-1.5">
                <span className="text-primary-400 mt-0.5 shrink-0">·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {agent.instructions ? (
        <div>
          <p className="text-xs font-semibold text-dark-700/50 uppercase tracking-wider mb-1.5">
            Instructions
          </p>
          <pre className="text-xs bg-surface-soft rounded-md p-3 whitespace-pre-wrap text-dark-700/80 font-mono max-h-60 overflow-y-auto leading-relaxed border border-surface-border">
            {agent.instructions}
          </pre>
        </div>
      ) : (
        <p className="text-xs text-dark-700/40 italic">No instructions file found for this agent.</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AgentGraph({ agents = [], className }) {
  const [selected, setSelected] = useState(null)
  const { nodes, pos, edges, svgW, svgH } = computeLayout(agents)
  const selectedNode = selected ? nodes[selected] : null

  if (!agents.length) return null

  return (
    <div className={clsx(className)}>
      {/* Canvas */}
      <div className="overflow-x-auto rounded-lg border border-surface-border bg-white">
        <div
          className="relative"
          style={{ width: svgW, height: svgH, minWidth: '100%' }}
        >
          {/* SVG edges */}
          <svg
            width={svgW}
            height={svgH}
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="ag-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#cbd5e1" />
              </marker>
            </defs>
            {edges.map(({ from, to }) => {
              const f = pos[from]
              const t = pos[to]
              if (!f || !t) return null
              const x1 = f.x + NW / 2 + PD
              const y1 = f.y + NH + PD
              const x2 = t.x + NW / 2 + PD
              const y2 = t.y + PD
              const cy = (y1 + y2) / 2
              return (
                <path
                  key={`${from}→${to}`}
                  d={`M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  markerEnd="url(#ag-arrow)"
                />
              )
            })}
          </svg>

          {/* Node cards */}
          {Object.entries(pos).map(([id, p]) => {
            const n = nodes[id]
            const s = ts(n.tier)
            const isSel = selected === id
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                aria-pressed={isSel}
                onKeyDown={e => e.key === 'Enter' && setSelected(isSel ? null : id)}
                className={clsx(
                  'absolute rounded-lg cursor-pointer select-none transition-all duration-150',
                  isSel
                    ? 'shadow-lg scale-[1.04]'
                    : 'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                )}
                style={{
                  left: p.x + PD,
                  top: p.y + PD,
                  width: NW,
                  height: NH,
                  background: s.bg,
                  border: `2px solid ${isSel ? '#0B6BB4' : s.border}`,
                  outline: isSel ? '3px solid rgba(11,107,180,0.2)' : 'none',
                  outlineOffset: 2,
                }}
                onClick={() => setSelected(isSel ? null : id)}
              >
                <div className="px-3 pt-2.5 pb-2 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.dot }}
                      />
                      <span
                        className="text-xs font-bold truncate"
                        style={{ color: s.name }}
                      >
                        {n.name}
                      </span>
                    </div>
                    <p className="text-xs text-dark-800/80 leading-snug line-clamp-2 pl-3.5">
                      {n.role}
                    </p>
                  </div>
                  <p className="text-[10px] text-dark-700/40 truncate pl-3.5">
                    {[n.model, n.schedule].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tier legend */}
      <div className="flex items-center gap-5 flex-wrap mt-2 px-0.5">
        {Object.entries(TIER).map(([tier, s]) => (
          <span key={tier} className="flex items-center gap-1.5 text-xs text-dark-700/50">
            <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
            {tier}
          </span>
        ))}
        <span className="ml-auto text-xs text-dark-700/35 italic">
          Click a node to inspect instructions
        </span>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <AgentDetail agent={selectedNode} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
