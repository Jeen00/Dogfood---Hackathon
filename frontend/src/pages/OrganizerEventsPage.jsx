import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Plus } from 'lucide-react'

function getStatusStyle(status) {
  if (status === 'running') return 'text-emerald-400'
  if (status === 'upcoming') return 'text-amber-400'
  return 'text-white/30'
}

export default function OrganizerEventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', submissions_open: '', submissions_close: '', voting_open: '', voting_close: '' })
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetch('/api/organizer/events')
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function createEvent(e) {
    e.preventDefault()
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: `Event "${form.name}" created.` })
      setForm({ name: '', submissions_open: '', submissions_close: '', voting_open: '', voting_close: '' })
      setShowCreate(false)
      // Refresh
      fetch('/api/organizer/events').then(r => r.json()).then(d => setEvents(d.events || []))
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to create event' })
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-4 cursor-pointer group">
            <div className="w-8 h-[2px] bg-white transition-all group-hover:w-12" />
            <span className="font-bold tracking-[0.2em] text-sm uppercase">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/organizer/dashboard')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => navigate('/organizer/results')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Results</button>
            <button onClick={() => navigate('/organizer/assignments')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Assignments</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Hackathons</h1>
            <p className="text-white/40 font-light text-sm max-w-xl">All hackathon events managed from this portal.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 h-11 px-7 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all shrink-0"
          >
            <Plus size={14} /> New Hackathon
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-16 p-8 border border-white/10 rounded-[32px] bg-white/[0.02] space-y-8"
          >
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30">New Hackathon Event</h2>
            <form onSubmit={createEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2 col-span-2 border-b border-white/10 pb-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Event Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="DOGFOOD Spring 2027" required className="bg-transparent py-2 text-white placeholder:text-white/20 focus:outline-none text-sm font-light" />
                </div>
                {[
                  { key: 'submissions_open', label: 'Submissions Open' },
                  { key: 'submissions_close', label: 'Submissions Close' },
                  { key: 'voting_open', label: 'Voting Open' },
                  { key: 'voting_close', label: 'Voting Close' },
                ].map(f => (
                  <div key={f.key} className="flex flex-col gap-2 border-b border-white/10 pb-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">{f.label}</label>
                    <input type="datetime-local" value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="bg-transparent py-2 text-white focus:outline-none text-sm font-light [color-scheme:dark]" />
                  </div>
                ))}
              </div>
              {msg && <p className={`text-xs font-light ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
              <div className="flex gap-4">
                <button type="submit" className="h-11 px-7 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all">Create Event</button>
                <button type="button" onClick={() => setShowCreate(false)} className="h-11 px-7 rounded-full border border-white/10 text-white/50 text-xs font-medium uppercase tracking-widest hover:text-white transition-all">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-white/30 text-xs uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="hidden md:grid grid-cols-12 gap-6 text-[10px] uppercase tracking-[0.2em] text-white/30 border-b border-white/10 pb-4 mb-4">
              <div className="col-span-4">Event</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Projects</div>
              <div className="col-span-2">Tracks</div>
              <div className="col-span-2 text-right">Action</div>
            </div>
            {events.map((event, i) => (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                key={event.id}
                className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-6 border-b border-white/5 hover:border-white/15 transition-colors"
              >
                <div className="col-span-4">
                  <div className="font-medium tracking-wide">{event.name}</div>
                  <div className="text-white/30 font-mono text-[10px] mt-1">{event.id}</div>
                </div>
                <div className="col-span-2">
                  <span className={`text-[10px] uppercase tracking-[0.15em] font-medium ${getStatusStyle(event.statusInfo?.status)}`}>
                    {event.statusInfo?.label || 'Unknown'}
                  </span>
                  <div className="text-white/20 text-[10px] mt-0.5">{event.statusInfo?.timeText}</div>
                </div>
                <div className="col-span-2 text-white/50 text-sm font-light">{event.project_count}</div>
                <div className="col-span-2 text-white/50 text-sm font-light">{event.track_count}</div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => navigate(`/organizer/dashboard?event_id=${event.id}`)}
                    className="h-9 px-5 rounded-full border border-white/10 text-xs font-medium uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-all flex items-center gap-2"
                  >
                    Manage <ArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
            {events.length === 0 && (
              <div className="py-20 text-center text-white/30 font-light text-sm">No hackathon events yet. Create one above.</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
