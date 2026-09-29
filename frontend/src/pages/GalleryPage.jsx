import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Code } from '@phosphor-icons/react'
import DinoIcon from '../components/DinoIcon'
import { PageContainer, DarkCard, WhiteCard, Heading } from '../components/Theme'

import Navbar from '../components/Navbar'

// ...
const hoverColors = ['hover:bg-blue-500/40', 'hover:bg-amber-500/40', 'hover:bg-rose-500/40', 'hover:bg-fuchsia-500/40', 'hover:bg-emerald-500/40']

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
    <PageContainer>
      <Navbar />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 flex flex-col gap-10 overflow-y-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6 mb-8"
        >
          <Heading className="justify-center flex">
            Project Gallery
          </Heading>
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
              className={`px-4 py-1.5 rounded-2xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                !activeTrack ? 'bg-white text-black' : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
              }`}
            >
              All Tracks
            </button>
            {tracks.map(t => (
              <button
                key={t.id}
                onClick={() => setSearchParams({ track: t.id })}
                className={`px-4 py-1.5 rounded-2xl text-[10px] font-medium uppercase tracking-widest transition-all ${
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
            {projects.map((project, i) => {
              
              const hoverColor = hoverColors[i % hoverColors.length];
              
              const textClass = 'text-white';
              const subTextClass = 'text-white/60';
              const labelClass = 'bg-white/5 border-white/10 text-white/50';
              const linkClass = 'text-white/40 hover:text-white';

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  key={project.id}
                  className="h-full"
                >
                  <DarkCard className="flex flex-col h-full hover:-translate-y-1 transition-transform rounded-2xl" hoverColor={hoverColor}>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-6 gap-4">
                        <h2 className={`text-xl font-medium tracking-wide leading-tight ${textClass}`}>{project.title}</h2>
                        <span className={`px-3 py-1 rounded-2xl border text-[10px] uppercase tracking-widest shrink-0 ${labelClass}`}>
                          {project.status || 'Submitted'}
                        </span>
                      </div>
                      <p className={`font-light text-sm leading-relaxed mb-8 line-clamp-4 ${subTextClass}`}>
                        {project.summary}
                      </p>
                      
                      <div className="pt-5 flex items-center justify-between mt-auto">
                        <a 
                          href={project.repo_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-medium transition-colors ${linkClass}`}
                        >
                          <Code size={14} weight="duotone" /> Repository
                        </a>
                      </div>
                    </div>
                  </DarkCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
