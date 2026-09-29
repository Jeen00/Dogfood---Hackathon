import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Code } from 'lucide-react'
import { PageContainer, Heading, DarkCard, WhiteCard } from '../components/Theme'
import Navbar from '../components/Navbar'

// Icon map for tracks — fallback to a number badge
const TRACK_ICONS = {
  'AI': '🤖',
  'Developer': '⚙️',
  'Hardware': '🔌',
  'IoT': '🔌',
  'Cloud': '☁️',
  'Bio': '🧬',
  'Life': '🧬',
  'Foundational': '🧠',
  'Data': '📊',
  'Security': '🔐',
  'Mobile': '📱',
  'Web': '🌐',
}

const hoverColors = ['hover:bg-blue-500/40', 'hover:bg-amber-500/40', 'hover:bg-rose-500/40', 'hover:bg-fuchsia-500/40', 'hover:bg-emerald-500/40']

function getTrackIcon(name) {
  const word = Object.keys(TRACK_ICONS).find(k => name.includes(k))
  return word ? TRACK_ICONS[word] : '🏷️'
}

export default function TracksPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [detail, setDetail] = useState(null)  // { tracks, prizes }
  const [detailLoading, setDetailLoading] = useState(false)
  const [projectCounts, setProjectCounts] = useState({}) // trackId -> count

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(async d => {
        const evts = d.events || []
        setEvents(evts)
        // Default to first running event, else first
        const running = evts.find(e => {
          const now = new Date()
          const open = e.submissions_open ? new Date(e.submissions_open) : null
          const close = e.submissions_close ? new Date(e.submissions_close) : null
          return open && close && now >= open && now <= close
        }) || evts[0]
        if (running) {
          setSelectedEvent(running)
          loadDetail(running.id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  async function loadDetail(eventId) {
    setDetailLoading(true)
    try {
      const [eventRes, galleryRes] = await Promise.all([
        fetch(`/api/events/${eventId}`).then(r => r.json()),
        fetch('/projects/api').then(r => r.json())
      ])
      setDetail({ tracks: eventRes.tracks || [], prizes: eventRes.prizes || [] })
      // Count projects per track
      const counts = {}
      for (const p of (galleryRes.projects || [])) {
        counts[p.track_id] = (counts[p.track_id] || 0) + 1
      }
      setProjectCounts(counts)
    } catch (e) { console.error(e) }
    setDetailLoading(false)
    setLoading(false)
  }

  function handleEventSwitch(evt) {
    setSelectedEvent(evt)
    loadDetail(evt.id)
  }

  function getEventStatus(evt) {
    const now = new Date()
    const open = evt.submissions_open ? new Date(evt.submissions_open) : null
    const close = evt.submissions_close ? new Date(evt.submissions_close) : null
    if (!open || !close) return { label: 'Open', color: 'text-emerald-400' }
    if (now < open) return { label: 'Upcoming', color: 'text-amber-400' }
    if (now > close) return { label: 'Completed', color: 'text-white/30' }
    return { label: 'Running', color: 'text-emerald-400' }
  }

  // Group prizes by track_id
  const prizesByTrack = {}
  if (detail?.prizes) {
    for (const p of detail.prizes) {
      const key = p.track_id || '__general__'
      if (!prizesByTrack[key]) prizesByTrack[key] = []
      prizesByTrack[key].push(p)
    }
  }

  return (
    <PageContainer>
      <Navbar />

      <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12">
        {/* Page Header */}
        <div className="mb-16 border-b border-white/10 pb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Heading className="mb-6">Tracks</Heading>
            <p className="text-white/50 font-light text-sm max-w-2xl leading-relaxed tracking-wide">
              Explore the hackathon competition tracks. Each track represents a distinct challenge domain — pick one that matches your team's expertise and vision.
            </p>
          </motion.div>
        </div>

        {/* Event Switcher */}
        {events.length > 1 && (
          <div className="flex gap-3 flex-wrap mb-16">
            {events.map(evt => {
              const status = getEventStatus(evt)
              const isActive = selectedEvent?.id === evt.id
              return (
                <button
                  key={evt.id}
                  onClick={() => handleEventSwitch(evt)}
                  className={`flex items-center gap-2 h-9 px-5 rounded-full text-[11px] font-medium uppercase tracking-widest transition-all ${
                    isActive
                      ? 'bg-white text-black'
                      : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-black' : status.color.replace('text-', 'bg-').replace('/400', '').replace('/30', '')}`} style={{ backgroundColor: isActive ? 'black' : undefined }} />
                  {evt.name}
                </button>
              )
            })}
          </div>
        )}

        {loading || detailLoading ? (
          <div className="flex items-center gap-3 text-white/30 text-xs uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" />
            Loading tracks...
          </div>
        ) : !detail || detail.tracks.length === 0 ? (
          <div className="py-20 text-center text-white/30 font-light text-sm border border-dashed border-white/10 rounded-[24px]">
            No tracks found for this event.
          </div>
        ) : (
          <>
            {/* General prizes (not track-specific) */}
            {prizesByTrack['__general__'] && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-16">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-6">Overall Prizes</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {prizesByTrack['__general__'].map((prize, idx) => {
                    return (
                      <DarkCard key={prize.id} className="flex flex-col gap-1 p-6 rounded-2xl" hoverGlow={true} hoverColor="hover:bg-amber-500/40">
                        <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/80">{prize.title}</span>
                        {prize.description && <span className="text-xs font-light text-white/40">{prize.description}</span>}
                      </DarkCard>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Track Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {detail.tracks.map((track, i) => {
                const prizes = prizesByTrack[track.id] || []
                const projectCount = projectCounts[track.id] || 0
                const icon = getTrackIcon(track.name)
                
                
                const hoverColor = hoverColors[i % hoverColors.length]
                const badgeColor = 'text-amber-400/80 bg-amber-400/10 border-amber-400/20'

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.07, duration: 0.5 }}
                    key={track.id}
                    className="h-full"
                  >
                    <DarkCard className="h-full flex flex-col group justify-between rounded-2xl" hoverColor={hoverColor} hoverGlow={true} >
                      <div className="flex-1">
                        <div className="text-4xl mb-6">{icon}</div>
                        <h2 className="text-xl font-medium tracking-wide mb-3 text-white">{track.name}</h2>
                        <p className="text-xs font-mono uppercase tracking-widest text-white/40">{track.id}</p>
                      </div>

                      <div className="mt-8 pt-4 border-t flex items-center justify-between border-white/10">
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Code size={12} />
                          <span>{projectCount} project{projectCount !== 1 ? 's' : ''}</span>
                        </div>
                        {prizes.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {prizes.slice(0, 2).map(prize => (
                              <span key={prize.id} className={`text-[10px] uppercase tracking-[0.12em] font-medium px-2.5 py-1 rounded-2xl border ${badgeColor}`}>
                                {prize.title}
                              </span>
                            ))}
                            {prizes.length > 2 && (
                              <span className="text-[10px] text-white/30">+{prizes.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={() => navigate(`/projects?track=${track.id}`)}
                          className="w-full h-11 rounded-2xl border text-[11px] font-medium uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-white/10 hover:border-white/30 hover:bg-white hover:text-black text-white/50"
                        >
                          View Submissions <ArrowRight size={13} />
                        </button>
                      </div>
                    </DarkCard>
                  </motion.div>
                )
              })}
            </div>

            {/* Rubric callout */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-20"
            >
              <DarkCard className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center rounded-2xl" hoverColor="hover:bg-teal-500/40">
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Judging Criteria</p>
                  <h3 className="text-lg font-light tracking-wide mb-2 text-white">How projects are scored</h3>
                  <p className="text-white/70 text-sm font-light leading-relaxed">
                    All submissions are evaluated across three weighted criteria: <span className="font-medium text-white">Functionality (50%)</span>, <span className="font-medium text-white">Code Quality (30%)</span>, and <span className="font-medium text-white">Presentation (20%)</span>. Cross-judge normalization ensures fair scoring across all evaluators.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Functionality', value: 50 },
                    { label: 'Code Quality', value: 30 },
                    { label: 'Presentation', value: 20 },
                  ].map(c => (
                    <div key={c.label}>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/60 mb-1.5">
                        <span>{c.label}</span><span>{c.value}%</span>
                      </div>
                      <div className="h-[2px] bg-white/10 rounded-2xl overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${c.value}%` }} transition={{ delay: 0.8, duration: 0.8 }}
                          className="h-full bg-white rounded-2xl"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </DarkCard>
            </motion.div>
          </>
        )}
      </div>
    </PageContainer>
  )
}
