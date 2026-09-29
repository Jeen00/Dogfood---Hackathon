import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { PageContainer, DarkCard, WhiteCard, Heading, PrimaryButton, SecondaryButton } from '../components/Theme'

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
    <PageContainer>
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-4 cursor-pointer group"
          >
            <span className="font-bold tracking-[0.2em] text-sm uppercase text-white">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <button 
            onClick={() => {
              fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login'))
            }}
            className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="mb-24">
          <Heading className="mb-4">Evaluation</Heading>
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
            <div className="hidden md:grid grid-cols-12 gap-6 text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium pb-4 mb-4 px-6">
              <div className="col-span-4">Project</div>
              <div className="col-span-3">Track</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-4">
              {assignments.map((prj, i) => {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    key={prj.id}
                  >
                    <DarkCard className="!p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center group">
                      <div className="col-span-4">
                        <h3 className="text-lg font-medium tracking-wide transition-colors text-white group-hover:text-white/90">{prj.title}</h3>
                        <p className="font-mono text-[10px] uppercase tracking-widest mt-1 text-white/30">{prj.id}</p>
                      </div>
                      
                      <div className="col-span-3">
                        <span className="text-xs font-light tracking-wider text-white/50">
                          {prj.track_name}
                        </span>
                      </div>

                      <div className="col-span-3">
                        {prj.scored ? (
                          <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-emerald-400">Scored</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-[0.15em] font-medium flex items-center gap-2 text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-amber-400" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 flex justify-end">
                        {prj.scored ? (
                          <SecondaryButton 
                            onClick={() => navigate(`/judge/score/${prj.id}`, { state: { project: prj } })}
                            className="!w-auto !h-10 !px-6"
                          >
                            Edit <ArrowRight size={14} />
                          </SecondaryButton>
                        ) : (
                          <PrimaryButton 
                            onClick={() => navigate(`/judge/score/${prj.id}`, { state: { project: prj } })}
                            className="!w-auto !h-10 !py-0 !px-6 flex items-center justify-center gap-3"
                          >
                            Score <ArrowRight size={14} />
                          </PrimaryButton>
                        )}
                      </div>
                    </DarkCard>
                  </motion.div>
                );
              })}

              {assignments.length === 0 && (
                <DarkCard className="py-20 text-center flex justify-center items-center">
                  <div className="text-white/30 font-light text-sm tracking-wide">
                    Your queue is currently empty.
                  </div>
                </DarkCard>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
