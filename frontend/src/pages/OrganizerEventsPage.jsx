import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Plus, ArrowLeft } from 'lucide-react'
import { PageContainer, DarkCard, WhiteCard, Heading, Label, Input, PrimaryButton, SecondaryButton } from '../components/Theme'

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
    <PageContainer>
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="rounded-full px-4 py-2 bg-white/10 hover:bg-white/20 flex items-center gap-2 text-[10px] font-medium tracking-widest uppercase transition-colors text-white">
              <ArrowLeft size={16} /> Back
            </button>
            <div onClick={() => navigate('/')} className="cursor-pointer group flex items-center">
              <span className="font-bold tracking-[0.2em] text-sm uppercase text-white">DOGFOOD<span className="opacity-50">2026</span></span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/organizer/dashboard')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => navigate('/organizer/results')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Results</button>
            <button onClick={() => navigate('/organizer/assignments')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Assignments</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl w-full mx-auto px-6 py-20 flex-1">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-8">
          <div>
            <Heading className="mb-2">Hackathons</Heading>
            <p className="text-white/40 font-light text-sm max-w-xl">All hackathon events managed from this portal.</p>
          </div>
          <PrimaryButton
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center justify-center gap-2 !w-auto px-7 !h-11 !py-0 shrink-0"
          >
            <Plus size={14} /> New Hackathon
          </PrimaryButton>
        </div>

        {/* Create Form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <WhiteCard className="space-y-8" hoverColor="hover:bg-white/80">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-bold">New Hackathon Event</h2>
              <form onSubmit={createEvent} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-2 col-span-2 pb-2">
                    <Label className="!text-black/60">Event Name</Label>
                    <Input 
                      type="text" 
                      value={form.name} 
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                      placeholder="DOGFOOD Spring 2027" 
                      required 
                      className="!bg-black/5 !border-black/10 !text-black placeholder:!text-black/30 focus:!ring-black/20 focus:!border-black/20"
                    />
                  </div>
                  {[
                    { key: 'submissions_open', label: 'Submissions Open' },
                    { key: 'submissions_close', label: 'Submissions Close' },
                    { key: 'voting_open', label: 'Voting Open' },
                    { key: 'voting_close', label: 'Voting Close' },
                  ].map(f => (
                    <div key={f.key} className="flex flex-col gap-2 pb-2">
                      <Label className="!text-black/60">{f.label}</Label>
                      <Input 
                        type="datetime-local" 
                        value={form[f.key]} 
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} 
                        className="!bg-black/5 !border-black/10 !text-black focus:!ring-black/20 focus:!border-black/20 [color-scheme:light]"
                      />
                    </div>
                  ))}
                </div>
                {msg && <p className={`text-xs font-medium ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
                <div className="flex gap-4">
                  <PrimaryButton type="submit" className="!w-auto px-7 !h-11 !py-0 !bg-black !text-white hover:!bg-black/80">Create Event</PrimaryButton>
                  <SecondaryButton type="button" onClick={() => setShowCreate(false)} className="!w-auto px-7 !h-11 !py-0 !border-black/10 !text-black/60 hover:!text-black hover:!bg-black/5 !shadow-none">Cancel</SecondaryButton>
                </div>
              </form>
            </WhiteCard>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-white/30 text-xs uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" /> Loading...
          </div>
        ) : (
          <DarkCard className="!p-0 overflow-hidden" hoverColor="" hoverGlow={false}>
            <div className="p-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold mb-6">Existing Events</h2>
              <div className="hidden md:grid grid-cols-12 gap-6 text-xs uppercase tracking-[0.2em] text-white/30 border-b border-white/10 pb-4 mb-4">
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
                  className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-6 border-b border-white/5 hover:border-white/15 transition-colors last:border-b-0"
                >
                  <div className="col-span-4">
                    <div className="font-medium tracking-wide text-lg">{event.name}</div>
                    <div className="text-white/30 font-mono text-sm mt-1">{event.id}</div>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-sm uppercase tracking-[0.15em] font-medium ${getStatusStyle(event.statusInfo?.status)}`}>
                      {event.statusInfo?.label || 'Unknown'}
                    </span>
                    <div className="text-white/20 text-sm mt-0.5">{event.statusInfo?.timeText}</div>
                  </div>
                  <div className="col-span-2 text-white/50 text-sm font-light">{event.project_count}</div>
                  <div className="col-span-2 text-white/50 text-sm font-light">{event.track_count}</div>
                  <div className="col-span-2 flex justify-end">
                    <SecondaryButton
                      onClick={() => navigate(`/organizer/dashboard?event_id=${event.id}`)}
                      className="!w-auto px-5 !h-9 !py-0 !rounded-full !border-white/10 !text-white/50 hover:!text-white hover:!border-white/30 gap-2 text-xs"
                    >
                      Manage <ArrowRight size={12} />
                    </SecondaryButton>
                  </div>
                </motion.div>
              ))}
              {events.length === 0 && (
                <div className="py-20 text-center text-white/30 font-light text-sm">No hackathon events yet. Create one above.</div>
              )}
            </div>
          </DarkCard>
        )}
      </div>
    </PageContainer>
  )
}
