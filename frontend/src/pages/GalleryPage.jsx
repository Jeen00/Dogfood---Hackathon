import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Code } from 'lucide-react'

export default function GalleryPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/projects/api')
      .then(r => r.json())
      .then(d => {
        setProjects(d.projects || [])
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-8 h-[2px] bg-white transition-all group-hover:w-12" />
            <span className="font-bold tracking-[0.2em] text-sm uppercase">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-xs tracking-wider uppercase text-white/50 hover:text-white transition-colors"
          >
            Back to Home
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Project Gallery</h1>
          <p className="text-white/50 font-light max-w-2xl leading-relaxed">
            Explore the innovative submissions built by participants during the DOGFOOD 2026 hackathon.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-white/40 font-light uppercase tracking-widest text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
            Loading projects...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                key={project.id}
                className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-[32px] p-8 transition-all flex flex-col h-full shadow-2xl"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-6 gap-4">
                    <h2 className="text-xl font-medium tracking-wide leading-tight group-hover:text-white transition-colors">{project.title}</h2>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-white/50 shrink-0">
                      {project.status || 'Submitted'}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm font-light leading-relaxed mb-8 line-clamp-4">
                    {project.summary}
                  </p>
                </div>
                
                <div className="pt-6 border-t border-white/10 flex items-center justify-between mt-auto">
                  <a 
                    href={project.repo_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-medium text-white/50 hover:text-white transition-colors"
                  >
                    <Code size={14} /> Repository
                  </a>
                  <button className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-white flex items-center justify-center transition-colors cursor-pointer">
                    <ArrowRight size={16} className="text-white group-hover:text-black transition-colors" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
