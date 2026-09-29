import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Trash2, Plus, RefreshCw, UserPlus, ArrowLeft } from 'lucide-react'
import { PageContainer, DarkCard, WhiteCard, Heading, Subheading, Label, Input, Select, PrimaryButton, SecondaryButton } from '../components/Theme'

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
            <button onClick={() => navigate('/organizer/events')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Events</button>
            <button onClick={() => navigate('/organizer/dashboard')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => navigate('/organizer/results')} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Results</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="rounded-full px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-8">
          <div>
            <Heading className="mb-4">Assignments</Heading>
            <p className="text-white/60 font-light text-sm">Manage judge-to-project assignments.</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <SecondaryButton onClick={() => setShowInvite(!showInvite)} className="w-auto px-6 h-11">
              <UserPlus size={14} /> Invite Judge
            </SecondaryButton>
            <SecondaryButton onClick={() => setShowManual(!showManual)} className="w-auto px-6 h-11">
              <Plus size={14} /> Manual Assign
            </SecondaryButton>
            <PrimaryButton onClick={autoAssign} className="w-auto px-6 h-11 flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Auto-Assign
            </PrimaryButton>
          </div>
        </div>

        {autoMsg && <p className={`text-sm font-medium mb-8 ${autoMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{autoMsg.text}</p>}

        {/* Invite Judge Panel */}
        {showInvite && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <DarkCard>
              <Subheading className="!text-[12px] !text-white/50 mb-6">Invite New Judge</Subheading>
              <form onSubmit={inviteJudge} className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex flex-col gap-2 flex-1 w-full">
                  <Label>Full Name</Label>
                  <Input type="text" value={inviteForm.name} onChange={e => setInviteForm(f => ({...f, name: e.target.value}))} required placeholder="Jane Smith" />
                </div>
                <div className="flex flex-col gap-2 flex-1 w-full">
                  <Label>Email</Label>
                  <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} required placeholder="judge@example.com" />
                </div>
                <PrimaryButton type="submit" className="w-auto px-8 h-12 shrink-0">Invite</PrimaryButton>
              </form>
              {inviteMsg && <p className={`text-sm font-medium mt-6 ${inviteMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{inviteMsg.text}</p>}
            </DarkCard>
          </motion.div>
        )}

        {/* Manual Assign Panel */}
        {showManual && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <DarkCard>
              <Subheading className="!text-[12px] !text-white/50 mb-6">Manual Assignment</Subheading>
              <form onSubmit={manualAssign} className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex flex-col gap-2 flex-1 w-full">
                  <Label>Judge</Label>
                  <Select value={manualForm.judge_id} onChange={e => setManualForm(f => ({...f, judge_id: e.target.value}))} required>
                    <option value="">Select judge</option>
                    {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                  </Select>
                </div>
                <div className="flex flex-col gap-2 flex-1 w-full">
                  <Label>Project</Label>
                  <Select value={manualForm.project_id} onChange={e => setManualForm(f => ({...f, project_id: e.target.value}))} required>
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </Select>
                </div>
                <PrimaryButton type="submit" className="w-auto px-8 h-12 shrink-0">Assign</PrimaryButton>
              </form>
              {manualMsg && <p className={`text-sm font-medium mt-6 ${manualMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{manualMsg.text}</p>}
            </DarkCard>
          </motion.div>
        )}

        {/* Assignments Table */}
        <DarkCard hoverColor="" hoverGlow={false} className="mt-4">
          <div className="flex items-center justify-between mb-8">
            <Subheading className="!text-[14px] !text-white/60 font-semibold">Current Assignments</Subheading>
            <span className="text-white/40 text-xs font-medium bg-white/5 px-3 py-1 rounded-full">{assignments.length} Total</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-3 text-white/50 text-xs uppercase tracking-widest py-8">
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="hidden md:grid grid-cols-12 gap-6 text-[10px] uppercase tracking-[0.2em] text-white/50 border-b border-white/10 pb-4 mb-2">
                <div className="col-span-4">Judge</div>
                <div className="col-span-4">Project</div>
                <div className="col-span-2">Track</div>
                <div className="col-span-2 text-right">Remove</div>
              </div>
              {assignments.map((a, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  key={a.id}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-4 border-b border-white/5 hover:bg-white/[0.02] -mx-4 px-4 rounded-xl transition-all"
                >
                  <div className="col-span-4 text-sm font-medium text-white/80">{a.judge_name}</div>
                  <div className="col-span-4 text-sm text-white/70">{a.project_title}</div>
                  <div className="col-span-2 text-xs text-white/50 bg-white/5 px-2 py-1 rounded-md w-fit">{a.track_name || 'N/A'}</div>
                  <div className="col-span-2 flex justify-end">
                    <button onClick={() => removeAssignment(a.id)} className="text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-all p-2 rounded-full">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {assignments.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-2">
                    <RefreshCw size={20} />
                  </div>
                  <p className="text-white/60 font-medium">No assignments found</p>
                  <p className="text-white/40 text-sm">Use Auto-Assign or manually add them above.</p>
                </div>
              )}
            </div>
          )}
        </DarkCard>
      </div>
    </PageContainer>
  )
}
