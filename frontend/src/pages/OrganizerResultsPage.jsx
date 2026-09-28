import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, ArrowRight } from 'lucide-react'

export default function OrganizerResultsPage() {
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventName, setEventName] = useState('')

  useEffect(() => {
    fetch('/api/organizer/results')
      .then(r => r.json())
      .then(d => {
        setLeaderboard(d.leaderboard || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const rankColors = ['text-amber-400', 'text-white/60', 'text-orange-700']

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-4 cursor-pointer group">
            <div className="w-8 h-[2px] bg-white transition-all group-hover:w-12" />
            <span className="font-bold tracking-[0.2em] text-sm uppercase">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/organizer/events')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Events</button>
            <button onClick={() => navigate('/organizer/dashboard')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => navigate('/organizer/assignments')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Assignments</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Final Results</h1>
            <p className="text-white/40 font-light text-sm max-w-xl">Normalized leaderboard ranked by cross-judge Z-score.</p>
          </div>
          <a href="/api/export.csv" target="_blank" className="flex items-center gap-2 h-11 px-7 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all shrink-0">
            Export CSV
          </a>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-white/30 text-xs uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" /> Loading...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-20 text-center text-white/30 font-light text-sm border border-dashed border-white/10 rounded-[24px]">
            No results yet. Run normalization from the dashboard first.
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              {leaderboard.slice(0, 3).map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  key={item.project_id}
                  className={`p-8 rounded-[32px] border ${i === 0 ? 'border-amber-400/30 bg-amber-400/[0.04]' : 'border-white/10 bg-white/[0.02]'} flex flex-col gap-4`}
                >
                  <div className={`text-5xl font-light ${rankColors[i] || 'text-white/30'}`}>#{item.rank}</div>
                  <div>
                    <div className="font-medium tracking-wide text-lg">{item.project_title}</div>
                    <div className="text-white/40 text-sm font-light mt-1">{item.team_name}</div>
                    <div className="text-white/30 text-xs mt-1">{item.track_name}</div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/10">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Final Score</div>
                    <div className="text-2xl font-light">{item.final_normalized_score ?? '—'}</div>
                    <div className="text-white/20 text-xs mt-1">{item.reviews_count} review{item.reviews_count !== 1 ? 's' : ''}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Full Table */}
            <div className="flex flex-col">
              <div className="hidden md:grid grid-cols-12 gap-6 text-[10px] uppercase tracking-[0.2em] text-white/30 border-b border-white/10 pb-4 mb-4">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Project</div>
                <div className="col-span-2">Team</div>
                <div className="col-span-2">Track</div>
                <div className="col-span-1">Reviews</div>
                <div className="col-span-2 text-right">Score</div>
              </div>
              {leaderboard.map((item, i) => (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                  key={item.project_id}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-5 border-b border-white/5 hover:border-white/15 transition-colors"
                >
                  <div className={`col-span-1 font-light text-lg ${rankColors[i] || 'text-white/30'}`}>#{item.rank}</div>
                  <div className="col-span-4">
                    <div className="font-medium tracking-wide">{item.project_title}</div>
                    {item.repo_url && (
                      <a href={item.repo_url} target="_blank" rel="noreferrer" className="text-white/30 text-[10px] hover:text-white transition-colors">{item.repo_url}</a>
                    )}
                  </div>
                  <div className="col-span-2 text-white/50 text-sm font-light">{item.team_name}</div>
                  <div className="col-span-2 text-white/50 text-sm font-light">{item.track_name}</div>
                  <div className="col-span-1 text-white/30 text-sm font-light">{item.reviews_count}</div>
                  <div className="col-span-2 text-right">
                    <span className="text-lg font-light">{item.final_normalized_score ?? <span className="text-white/20 text-sm">—</span>}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
