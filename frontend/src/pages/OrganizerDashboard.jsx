import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowRight, Download } from 'lucide-react'
import { PageContainer, DarkCard, WhiteCard, Heading, PrimaryButton, SecondaryButton } from '../components/Theme'

export default function OrganizerDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [stats, setStats] = useState({ totalProjects: 0, activeJudges: 0, scoresSubmitted: 0, completionRate: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/organizer/progress').then(r => r.json()),
      fetch('/api/organizer/stats').then(r => r.json())
    ])
      .then(([progress, statsData]) => {
        if (progress.projectCoverage) {
          setData(progress.projectCoverage.map(p => ({
            name: p.team_name,
            scored: p.reviews_received,
            total: p.reviews_needed
          })))
        }
        setStats({
          totalProjects: statsData.totalProjects ?? 0,
          activeJudges: statsData.activeJudges ?? 0,
          scoresSubmitted: statsData.scoresSubmitted ?? 0,
          completionRate: statsData.completionRate ?? 0
        })
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const runNormalization = async () => {
    try {
      const res = await fetch('/api/normalization/run', { method: 'POST' })
      if (res.ok) {
        alert('Normalization run successfully!')
      } else {
        alert('Failed to run normalization.')
      }
    } catch (err) {
      alert('Error running normalization.')
    }
  }

  return (
    <PageContainer>
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-4 cursor-pointer group">
            <span className="font-bold tracking-[0.2em] text-sm uppercase text-white">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/organizer/events')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Events</button>
            <button onClick={() => navigate('/organizer/results')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Results</button>
            <button onClick={() => navigate('/organizer/assignments')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Assignments</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl w-full mx-auto px-6 py-20 flex-1">
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div>
            <Heading className="mb-4">Command Center</Heading>
            <p className="text-white/40 font-light text-sm max-w-xl leading-relaxed tracking-wide">
              Real-time monitoring of judge completion and cross-judge normalization.
            </p>
          </div>
          
          <div className="flex gap-4">
            <SecondaryButton 
              onClick={runNormalization}
              className="!w-auto px-6 !rounded-full"
            >
              Normalize Scores
            </SecondaryButton>
            <PrimaryButton 
              onClick={() => window.open('/api/export.csv', '_blank')}
              className="!w-auto px-6 flex items-center justify-center gap-2"
            >
              <Download size={14} /> Export CSV
            </PrimaryButton>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-white/30 font-light uppercase tracking-widest text-xs">
            <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" />
            Loading telemetry...
          </div>
        ) : (
          <div className="space-y-24">
            
            {/* Topline Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Projects', value: stats.totalProjects, iconColor: 'text-sky-400', dotBg: 'bg-sky-400/20', hoverBg: 'hover:bg-sky-500/20' },
                { label: 'Active Judges', value: stats.activeJudges, iconColor: 'text-amber-400', dotBg: 'bg-amber-400/20', hoverBg: 'hover:bg-amber-500/20' },
                { label: 'Scores Submitted', value: stats.scoresSubmitted, iconColor: 'text-emerald-400', dotBg: 'bg-emerald-400/20', hoverBg: 'hover:bg-emerald-500/20' },
                { label: 'Completion Rate', value: `${stats.completionRate}%`, iconColor: 'text-fuchsia-400', dotBg: 'bg-fuchsia-400/20', hoverBg: 'hover:bg-fuchsia-500/20' },
              ].map((stat, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  key={i} 
                >
                  <DarkCard className="flex flex-col h-full justify-center" hoverColor={stat.hoverBg}>
                    <div className={`w-8 h-8 rounded-lg ${stat.dotBg} flex items-center justify-center mb-4`}>
                      <div className={`w-2 h-2 rounded-full ${stat.iconColor} bg-current`} />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium mb-2">{stat.label}</span>
                    <span className={`text-4xl md:text-5xl font-light tracking-tight ${stat.iconColor}`}>{stat.value}</span>
                  </DarkCard>
                </motion.div>
              ))}
            </div>

            {/* Chart */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="w-full"
            >
              <DarkCard hoverColor="" hoverGlow={false}>
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/80 font-medium mb-12">Team Evaluation Coverage</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.3)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                        className="font-light tracking-wider uppercase"
                      />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#0a0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="scored" fill="#ffffff" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </DarkCard>
            </motion.div>

          </div>
        )}
      </div>
    </PageContainer>
  )
}
