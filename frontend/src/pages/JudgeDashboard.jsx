import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function JudgeDashboard() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/judge/assignments')
      .then(res => res.json())
      .then(data => {
        if (data.assignments) {
          setAssignments(data.assignments)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch assignments', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-24">
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Evaluation</h1>
          <p className="text-white/40 font-light text-sm max-w-xl leading-relaxed tracking-wide">
            Your assigned projects require rigorous review. Ensure objectivity across all criteria.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-white/30 font-light uppercase tracking-widest text-xs">
            <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" />
            Syncing Assignments...
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-6 text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium border-b border-white/10 pb-4 mb-4">
              <div className="col-span-4">Project</div>
              <div className="col-span-3">Track</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {/* List */}
            <div className="flex flex-col">
              {assignments.map((prj, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  key={prj.id}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-6 border-b border-white/5 hover:border-white/20 transition-colors"
                >
                  <div className="col-span-4">
                    <h3 className="text-lg font-medium tracking-wide text-white group-hover:text-white/90 transition-colors">{prj.title}</h3>
                    <p className="text-white/30 font-mono text-[10px] uppercase tracking-widest mt-1">{prj.id}</p>
                  </div>
                  
                  <div className="col-span-3">
                    <span className="text-xs font-light text-white/50 tracking-wider">
                      {prj.track_name}
                    </span>
                  </div>

                  <div className="col-span-3">
                    {prj.scored ? (
                      <span className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 font-medium">Scored</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.15em] text-amber-400 font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <button 
                      onClick={() => navigate(`/judge/score/${prj.id}`, { state: { project: prj } })}
                      className={`h-10 px-6 rounded-full text-xs font-medium uppercase tracking-widest transition-all flex items-center gap-3 ${
                        prj.scored 
                          ? 'bg-transparent border border-white/10 text-white/50 hover:text-white hover:border-white/30' 
                          : 'bg-white text-black hover:bg-white/90 shadow-lg'
                      }`}
                    >
                      {prj.scored ? 'Edit' : 'Score'} <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}

              {assignments.length === 0 && (
                <div className="py-20 text-center text-white/30 font-light text-sm tracking-wide">
                  Your queue is currently empty.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
