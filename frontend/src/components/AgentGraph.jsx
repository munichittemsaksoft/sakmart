import { useRef, useState, useLayoutEffect, useCallback } from 'react'
import clsx from 'clsx'

const TIER = {
  leadership: {
    label: 'Leadership',
    card: 'bg-violet-50 border-violet-200',
    dot: 'bg-violet-500',
    title: 'text-violet-800',
    sub: 'text-violet-500/70',
    header: 'text-violet-500',
    lineColor: '#7c3aed',
  },
  operations: {
    label: 'Operations',
    card: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    title: 'text-blue-900',
    sub: 'text-blue-500/70',
    header: 'text-blue-500',
    lineColor: '#2563eb',
  },
  execution: {
    label: 'Execution',
    card: 'bg-orange-50 border-orange-200',
    dot: 'bg-orange-400',
    title: 'text-orange-900',
    sub: 'text-orange-500/70',
    header: 'text-orange-500',
    lineColor: '#ea580c',
  },
}

function AgentNode({ agent, tier, nodeRef }) {
  const cfg = TIER[tier] || TIER.execution
  return (
    <div
      ref={nodeRef}
      className={clsx(
        'rounded-xl border px-4 py-3 w-40 text-center shadow-sm flex-shrink-0',
        cfg.card,
      )}
    >
      <div className={clsx('w-2.5 h-2.5 rounded-full mx-auto mb-2', cfg.dot)} />
      <p className={clsx('font-semibold text-xs leading-snug', cfg.title)}>{agent.role}</p>
      <p className={clsx('text-[10px] mt-0.5 truncate', cfg.sub)}>{agent.model}</p>
      {agent.schedule && (
        <span className="inline-block mt-1.5 text-[9px] font-medium bg-white/60 rounded-full px-2 py-0.5 text-dark-700/60">
          {agent.schedule}
        </span>
      )}
    </div>
  )
}

function buildTreeLines(srcEls, dstEls, containerRect, color) {
  if (!srcEls.length || !dstEls.length) return []
  const cr = containerRect
  const srcRects = srcEls.map((el) => el.getBoundingClientRect())
  const dstRects = dstEls.map((el) => el.getBoundingClientRect())

  const midY =
    (Math.max(...srcRects.map((r) => r.bottom)) +
      Math.min(...dstRects.map((r) => r.top))) /
      2 -
    cr.top

  const lines = []

  // Drop from each src bottom to midY
  srcRects.forEach((r) => {
    const cx = r.left + r.width / 2 - cr.left
    lines.push({ x1: cx, y1: r.bottom - cr.top, x2: cx, y2: midY, color })
  })

  // Horizontal rail at midY spanning all src + dst centers
  const allX = [
    ...srcRects.map((r) => r.left + r.width / 2 - cr.left),
    ...dstRects.map((r) => r.left + r.width / 2 - cr.left),
  ]
  lines.push({ x1: Math.min(...allX), y1: midY, x2: Math.max(...allX), y2: midY, color })

  // Rise from midY to each dst top
  dstRects.forEach((r) => {
    const cx = r.left + r.width / 2 - cr.left
    lines.push({ x1: cx, y1: midY, x2: cx, y2: r.top - cr.top, color })
  })

  return lines
}

export default function AgentGraph({ agents }) {
  const containerRef = useRef(null)
  const nodeRefs = useRef({})
  const [lines, setLines] = useState([])
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })

  const TIER_ORDER = ['leadership', 'operations', 'execution']
  const byTier = (t) =>
    agents
      .filter((a) => (a.tier || '').toLowerCase() === t)
      .sort((a, b) => (a.position || 0) - (b.position || 0))

  const tierAgents = {
    leadership: byTier('leadership'),
    operations: byTier('operations'),
    execution: byTier('execution'),
  }
  const activeTiers = TIER_ORDER.filter((t) => tierAgents[t].length > 0)

  const compute = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const cr = container.getBoundingClientRect()
    setSvgSize({ w: cr.width, h: cr.height })

    const allLines = []
    for (let i = 0; i < activeTiers.length - 1; i++) {
      const srcTier = activeTiers[i]
      const dstTier = activeTiers[i + 1]
      const srcEls = tierAgents[srcTier]
        .map((_, idx) => nodeRefs.current[`${srcTier}-${idx}`])
        .filter(Boolean)
      const dstEls = tierAgents[dstTier]
        .map((_, idx) => nodeRefs.current[`${dstTier}-${idx}`])
        .filter(Boolean)
      allLines.push(...buildTreeLines(srcEls, dstEls, cr, TIER[srcTier].lineColor))
    }
    setLines(allLines)
  }, [agents]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    compute()
    const ro = new ResizeObserver(compute)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [compute])

  if (!agents.length) {
    return (
      <div className="py-12 text-center text-sm text-dark-700/40">
        No agents in this template yet.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative py-6 overflow-x-auto">
      {/* SVG connector lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={svgSize.w}
        height={svgSize.h}
        style={{ zIndex: 0 }}
      >
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={l.color}
            strokeWidth={1.5}
            strokeOpacity={0.4}
          />
        ))}
      </svg>

      {/* Tier rows */}
      <div className="relative space-y-10" style={{ zIndex: 1 }}>
        {activeTiers.map((tier) => (
          <div key={tier}>
            <p
              className={clsx(
                'text-[10px] font-bold uppercase tracking-widest text-center mb-3',
                TIER[tier].header,
              )}
            >
              {TIER[tier].label}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {tierAgents[tier].map((agent, i) => (
                <AgentNode
                  key={agent.id}
                  agent={agent}
                  tier={tier}
                  nodeRef={(el) => {
                    nodeRefs.current[`${tier}-${i}`] = el
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
