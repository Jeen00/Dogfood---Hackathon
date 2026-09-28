import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Code } from '@phosphor-icons/react'
import DinoIcon from '../components/DinoIcon'

export default function GalleryPage() {
  const [projects, setProjects] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTrack = searchParams.get('track') || ''

  useEffect(() => {
    fetch('/projects/api')
      .then(r => r.json())
      .then(d => {
        const p = d.projects || []
        setAllProjects(p)
        // Extract unique tracks
        const trackMap = {}
        p.forEach(proj => { if (proj.track_id && proj.track_name) trackMap[proj.track_id] = proj.track_name })
        setTracks(Object.entries(trackMap).map(([id, name]) => ({ id, name })))
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (activeTrack) {
      setProjects(allProjects.filter(p => p.track_id === activeTrack))
    } else {
      setProjects(allProjects)
    }
  }, [activeTrack, allProjects])

  return (
    <main className="relative flex flex-col min-h-screen w-full bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      
      {/* Background Video */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4"
          type="video/mp4"
        />
      </video>

      {/* Navigation Bar */}
      <div className="p-4 relative z-50">
        <nav className="max-w-7xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-8 py-5 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
            <button className="text-white/60 hover:text-white transition-colors bg-transparent border-none">
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="h-6 w-px bg-white/20" />
            <div className="relative flex flex-col items-center">
              <DinoIcon className="w-10 h-8 -ml-1 text-white" style={{ fill: 'currentColor' }} />
              <div className="w-8 h-[2px] mt-0.5 bg-white" />
            </div>
            <span className="font-bold tracking-[0.15em] text-lg uppercase flex items-start gap-1 text-white">
              DOGFOOD<span className="text-[10px] mt-0.5 opacity-60">®</span>
            </span>
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 flex flex-col gap-10 overflow-y-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6 mb-8"
        >
          <h1 className="text-5xl md:text-6xl tracking-tighter font-extrabold">
            Project Gallery
          </h1>
          <p className="text-white/60 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
            Explore the innovative submissions built by participants during the DOGFOOD 2026 hackathon.
          </p>
        </motion.div>

        {/* Track Filters */}
        {tracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-4"
          >
            <button
              onClick={() => setSearchParams({})}
              className={`px-4 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all ${
                !activeTrack ? 'bg-white text-black' : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
              }`}
            >
              All Tracks
            </button>
            {tracks.map(t => (
              <button
                key={t.id}
                onClick={() => setSearchParams({ track: t.id })}
                className={`px-4 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all ${
                  activeTrack === t.id ? 'bg-white text-black' : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
                }`}
              >
                {t.name}
              </button>
            ))}
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 text-white/40 font-light uppercase tracking-widest text-sm mt-12">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
            Loading projects...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                key={project.id}
                className="p-8 rounded-[2rem] bg-white/[0.02] backdrop-blur-xl border border-white/5 shadow-lg flex flex-col h-full hover:bg-white/[0.06] hover:border-white/15 transition-colors duration-200"
              >
                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-6 gap-4">
                    <h2 className="text-xl font-medium tracking-wide leading-tight text-white">{project.title}</h2>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-white/50 shrink-0">
                      {project.status || 'Submitted'}
                    </span>
                  </div>
                  <p className="text-white/60 font-light text-sm leading-relaxed mb-8 line-clamp-4">
                    {project.summary}
                  </p>
                  
                  <div className="pt-5 flex items-center justify-between mt-auto">
                    <a 
                      href={project.repo_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-medium text-white/40 hover:text-white transition-colors"
                    >
                      <Code size={14} weight="duotone" /> Repository
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
