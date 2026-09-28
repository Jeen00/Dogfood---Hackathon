import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Trash2, Plus, RefreshCw, UserPlus } from 'lucide-react'

export default function OrganizerAssignmentsPage() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [judges, setJudges] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoMsg, setAutoMsg] = useState(null)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' })
  const [inviteMsg, setInviteMsg] = useState(null)
  const [manualForm, setManualForm] = useState({ judge_id: '', project_id: '' })
  const [manualMsg, setManualMsg] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showManual, setShowManual] = useState(false)

  async function fetchAll() {
    setLoading(true)
    try {
      const [asgn, prog, gallery] = await Promise.all([
        fetch('/api/organizer/assignments').then(r => r.json()),
        fetch('/api/organizer/progress').then(r => r.json()),
        fetch('/projects/api').then(r => r.json())
      ])
      setAssignments(asgn.assignments || [])
      setJudges(prog.judgeProgress?.map(j => ({ id: j.judge_id, name: j.judge_name })) || [])
      setProjects(gallery.projects || [])
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function autoAssign() {
    setAutoMsg(null)
    const res = await fetch('/api/organizer/assignments/auto', { method: 'POST' })
    const data = await res.json()
    setAutoMsg({ type: res.ok ? 'success' : 'error', text: data.message || data.error })
    if (res.ok) fetchAll()
  }

  async function removeAssignment(id) {
    const res = await fetch(`/api/organizer/assignments/${id}`, { method: 'DELETE' })
    if (res.ok) fetchAll()
  }

  async function manualAssign(e) {
    e.preventDefault()
    const res = await fetch('/api/organizer/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualForm)
    })
    const data = await res.json()
    setManualMsg({ type: res.ok ? 'success' : 'error', text: data.message || data.error })
    if (res.ok) { setManualForm({ judge_id: '', project_id: '' }); fetchAll() }
  }

  async function inviteJudge(e) {
    e.preventDefault()
    const res = await fetch('/api/organizer/invite-judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm)
    })
    const data = await res.json()
    if (res.ok) {
      setInviteMsg({ type: 'success', text: data.success || 'Judge invited successfully.' })
      setInviteForm({ name: '', email: '' })
    } else {
      setInviteMsg({ type: 'error', text: data.error || 'Failed to invite judge.' })
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
            <button onClick={() => navigate('/organizer/events')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Events</button>
            <button onClick={() => navigate('/organizer/dashboard')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => navigate('/organizer/results')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Results</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Assignments</h1>
            <p className="text-white/40 font-light text-sm">Manage judge-to-project assignments.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-2 h-11 px-6 rounded-full border border-white/15 text-white text-xs font-medium uppercase tracking-widest hover:bg-white/5 transition-all">
              <UserPlus size={13} /> Invite Judge
            </button>
            <button onClick={() => setShowManual(!showManual)} className="flex items-center gap-2 h-11 px-6 rounded-full border border-white/15 text-white text-xs font-medium uppercase tracking-widest hover:bg-white/5 transition-all">
              <Plus size={13} /> Manual Assign
            </button>
            <button onClick={autoAssign} className="flex items-center gap-2 h-11 px-6 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all">
              <RefreshCw size={13} /> Auto-Assign
            </button>
          </div>
        </div>

        {autoMsg && <p className={`text-xs font-light mb-8 ${autoMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{autoMsg.text}</p>}

        {/* Invite Judge Panel */}
        {showInvite && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 p-8 border border-white/10 rounded-[32px] bg-white/[0.02]">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-6">Invite New Judge</h2>
            <form onSubmit={inviteJudge} className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex flex-col gap-2 flex-1 border-b border-white/10 pb-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Full Name</label>
                <input type="text" value={inviteForm.name} onChange={e => setInviteForm(f => ({...f, name: e.target.value}))} required className="bg-transparent py-2 text-white placeholder:text-white/20 focus:outline-none text-sm font-light" placeholder="Jane Smith" />
              </div>
              <div className="flex flex-col gap-2 flex-1 border-b border-white/10 pb-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Email</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} required className="bg-transparent py-2 text-white placeholder:text-white/20 focus:outline-none text-sm font-light" placeholder="judge@example.com" />
              </div>
              <button type="submit" className="h-11 px-7 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all shrink-0">Invite</button>
            </form>
            {inviteMsg && <p className={`text-xs font-light mt-4 ${inviteMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{inviteMsg.text}</p>}
          </motion.div>
        )}

        {/* Manual Assign Panel */}
        {showManual && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 p-8 border border-white/10 rounded-[32px] bg-white/[0.02]">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-6">Manual Assignment</h2>
            <form onSubmit={manualAssign} className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Judge</label>
                <select value={manualForm.judge_id} onChange={e => setManualForm(f => ({...f, judge_id: e.target.value}))} required className="bg-[#0a0d12] border-b border-white/15 py-3 text-white focus:outline-none text-sm font-light">
                  <option value="">Select judge</option>
                  {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Project</label>
                <select value={manualForm.project_id} onChange={e => setManualForm(f => ({...f, project_id: e.target.value}))} required className="bg-[#0a0d12] border-b border-white/15 py-3 text-white focus:outline-none text-sm font-light">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <button type="submit" className="h-11 px-7 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all shrink-0">Assign</button>
            </form>
            {manualMsg && <p className={`text-xs font-light mt-4 ${manualMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{manualMsg.text}</p>}
          </motion.div>
        )}

        {/* Assignments Table */}
        {loading ? (
          <div className="flex items-center gap-3 text-white/30 text-xs uppercase tracking-widest"><div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" /> Loading...</div>
        ) : (
          <div className="flex flex-col">
            <div className="hidden md:grid grid-cols-12 gap-6 text-[10px] uppercase tracking-[0.2em] text-white/30 border-b border-white/10 pb-4 mb-4">
              <div className="col-span-4">Judge</div>
              <div className="col-span-4">Project</div>
              <div className="col-span-2">Track</div>
              <div className="col-span-2 text-right">Remove</div>
            </div>
            {assignments.map((a, i) => (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                key={a.id}
                className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-5 border-b border-white/5 hover:border-white/15 transition-colors"
              >
                <div className="col-span-4 text-sm font-light text-white/80">{a.judge_name}</div>
                <div className="col-span-4 text-sm font-light">{a.project_title}</div>
                <div className="col-span-2 text-xs text-white/40">{a.track_name}</div>
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => removeAssignment(a.id)} className="text-white/20 hover:text-red-400 transition-colors p-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
            {assignments.length === 0 && (
              <div className="py-20 text-center text-white/30 font-light text-sm">No assignments yet. Use Auto-Assign or add manually.</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
