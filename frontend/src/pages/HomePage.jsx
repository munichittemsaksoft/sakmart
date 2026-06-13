import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, GitFork, Zap, Shield, Users } from 'lucide-react'
import { templateApi } from '@/utils/api'
import TemplateCard from '@/components/templates/TemplateCard'
import { Spinner } from '@/components/ui'

const FEATURES = [
  {
    icon: GitFork,
    title: 'Fork any template',
    desc: 'One-click to fork a complete AI company setup into your workspace.',
    color: 'text-primary-500 bg-primary-50',
  },
  {
    icon: Zap,
    title: 'Launch in 60 seconds',
    desc: 'Pre-wired agent hierarchies with schedules, models, and responsibilities.',
    color: 'text-accent-500 bg-accent-50',
  },
  {
    icon: Shield,
    title: 'Community curated',
    desc: 'Every template is reviewed and rated by real builders running AI businesses.',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: Users,
    title: 'Multi-agent hierarchies',
    desc: 'CEO → Manager → Executor patterns you can inspect and customize.',
    color: 'text-violet-600 bg-violet-50',
  },
]

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['templates', 'home'],
    queryFn: () => templateApi.list({ page: 1, size: 6, sort_by: 'fork_count' }),
  })

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-primary-900 text-white">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] 
                        bg-primary-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm 
                          rounded-full px-4 py-1.5 text-sm text-white/80 mb-6 border border-white/10">
            <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
            Community-built for the agentic ecosystem
          </div>

          <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl 
                         leading-[1.05] tracking-tight mb-6">
            Fork an AI company.{' '}
            <span className="text-accent-400 italic">Launch in 60 seconds.</span>
          </h1>

          <p className="text-white/60 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Browse agentic company templates. Import into your runtime. Edit agent hierarchies, 
            schedules, and models — then go.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/templates" className="btn-accent px-6 py-3 text-base font-semibold shadow-lg">
              Browse templates <ArrowRight size={17} />
            </Link>
            <Link to="/submit" className="btn px-6 py-3 text-base bg-white/10 text-white 
                                          border border-white/20 hover:bg-white/20">
              Submit yours →
            </Link>
          </div>

          {/* Social proof */}
          <p className="text-white/30 text-sm mt-8">
            Works with Paperclip · OpenClaw · Any agent runtime
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon size={20} />
              </div>
              <h3 className="font-display font-semibold text-dark-950 mb-1.5">{f.title}</h3>
              <p className="text-sm text-dark-700/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured templates ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-accent-500 font-semibold text-sm uppercase tracking-wider mb-1">
              Most forked
            </p>
            <h2 className="section-title">Top Templates</h2>
          </div>
          <Link to="/templates" className="btn-outline text-sm">View all →</Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data?.items?.map((t) => <TemplateCard key={t.id} template={t} />)}
          </div>
        )}
      </section>

      {/* ── CTA banner ────────────────────────────────────────── */}
      <section className="bg-primary-500 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="font-display font-bold text-3xl mb-3">Built an agentic company?</h2>
          <p className="text-white/70 mb-6 text-lg">
            Share your template with thousands of builders and earn recognition in the community.
          </p>
          <Link to="/submit" className="btn bg-white text-primary-600 hover:bg-primary-50 px-6 py-3 font-semibold text-base">
            Submit your template
          </Link>
        </div>
      </section>
    </div>
  )
}
