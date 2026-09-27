import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowRight, Download } from 'lucide-react'

export default function OrganizerDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [stats, setStats] = useState({ projects: 0, judges: 0, scores: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/organizer/progress')
      .then(res => res.json())
      .then(result => {
        if (result.judgeProgress && result.projectCoverage) {
          const chartData = result.projectCoverage.map(p => ({
            name: p.team_name,
            scored: p.reviews_received,
            total: p.reviews_needed
          }))
          setData(chartData)
          
          setStats({
            projects: result.projectCoverage.length,
            judges: result.judgeProgress.length,
            scores: result.judgeProgress.reduce((sum, j) => sum + j.completed, 0)
          })
        }
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
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-8 h-[2px] bg-white transition-all group-hover:w-12" />
            <span className="font-bold tracking-[0.2em] text-sm uppercase">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <button 
            onClick={() => {
              fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login'))
            }}
            className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Command Center</h1>
            <p className="text-white/40 font-light text-sm max-w-xl leading-relaxed tracking-wide">
              Real-time monitoring of judge completion and cross-judge normalization.
            </p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={runNormalization}
              className="px-6 py-3 rounded-full border border-white/10 text-xs font-medium uppercase tracking-widest text-white/60 hover:text-white hover:border-white/30 transition-all flex items-center gap-2"
            >
              Normalize Scores
            </button>
            <a 
              href="/api/export.csv"
              target="_blank"
              className="px-6 py-3 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-2"
            >
              <Download size={14} /> Export CSV
            </a>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
              {[
                { label: 'Total Projects', value: stats.projects },
                { label: 'Active Judges', value: stats.judges },
                { label: 'Scores Submitted', value: stats.scores }
              ].map((stat, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  key={i} 
                  className="flex flex-col border-l border-white/10 pl-6"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-4">{stat.label}</span>
                  <span className="text-5xl font-light tracking-tight">{stat.value}</span>
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
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-12">Team Evaluation Coverage</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.2)" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                      className="font-light tracking-wider uppercase"
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.02)'}}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="scored" fill="#ffffff" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

          </div>
        )}
      </main>
    </div>
  )
}

