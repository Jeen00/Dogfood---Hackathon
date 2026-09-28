import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Plus, Users, Link, Send } from 'lucide-react'

export default function ParticipantDashboard() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('team') // 'team' | 'submit'

  // Team creation
  const [teamName, setTeamName] = useState('')
  const [teamMsg, setTeamMsg] = useState(null)

  // Join team
  const [inviteCode, setInviteCode] = useState('')
  const [joinMsg, setJoinMsg] = useState(null)

  // Submission
  const [subTitle, setSubTitle] = useState('')
  const [subSummary, setSubSummary] = useState('')
  const [subRepo, setSubRepo] = useState('')
  const [subTrack, setSubTrack] = useState('')
  const [subTeam, setSubTeam] = useState('')
  const [subMsg, setSubMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [teamsRes, eventsRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/events')
      ])
      const teamsData = teamsRes.ok ? await teamsRes.json() : {}
      const eventsData = eventsRes.ok ? await eventsRes.json() : {}
      setTeams(teamsData.teams || [])

      // Get tracks from first event
      if (eventsData.events?.length > 0) {
        const eventDetail = await fetch(`/api/events/${eventsData.events[0].id}`)
        if (eventDetail.ok) {
          const d = await eventDetail.json()
          setTracks(d.tracks || [])
        }
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function createTeam(e) {
    e.preventDefault()
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName })
    })
    const data = await res.json()
    if (res.ok) {
      setTeamMsg({ type: 'success', text: `Team created! Invite code: ${data.invite_code}` })
      setTeamName('')
      fetchData()
    } else {
      setTeamMsg({ type: 'error', text: data.error || 'Failed to create team' })
    }
  }

  async function joinTeam(e) {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    const res = await fetch(`/api/teams/join/${code}`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setJoinMsg({ type: 'success', text: `Joined team "${data.team_name}"!` })
      setInviteCode('')
      fetchData()
    } else {
      setJoinMsg({ type: 'error', text: data.error || 'Failed to join team' })
    }
  }

  async function submitProject(e) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: subTitle,
        summary: subSummary,
        repo_url: subRepo,
        track_id: subTrack,
        team_id: subTeam
      })
    })
    const data = await res.json()
    if (res.ok) {
      setSubMsg({ type: 'success', text: 'Project submitted successfully! Head to the gallery to see it.' })
      setSubTitle(''); setSubSummary(''); setSubRepo(''); setSubTrack(''); setSubTeam('')
    } else {
      setSubMsg({ type: 'error', text: data.error || 'Submission failed' })
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-4 cursor-pointer group">
            <div className="w-8 h-[2px] bg-white transition-all group-hover:w-12" />
            <span className="font-bold tracking-[0.2em] text-sm uppercase">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/projects')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Gallery</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-16 border-b border-white/10 pb-12">
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Participant Hub</h1>
          <p className="text-white/40 font-light text-sm max-w-xl leading-relaxed">
            Manage your team and submit your project for DOGFOOD 2026.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-8 mb-16 border-b border-white/10">
          {[
            { id: 'team', label: 'Team', icon: Users },
            { id: 'submit', label: 'Submit Project', icon: Send }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 text-xs uppercase tracking-[0.2em] font-medium transition-all border-b-2 -mb-[1px] ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'team' && (
            <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16">

              {/* My Teams */}
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8">Your Teams</h2>
                {loading ? (
                  <div className="text-white/30 text-sm font-light">Loading...</div>
                ) : teams.length === 0 ? (
                  <div className="py-12 text-center text-white/30 font-light text-sm border border-dashed border-white/10 rounded-[24px]">
                    You are not part of any team yet. Create one or join below.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teams.map((team, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        key={team.id}
                        className="flex items-center justify-between py-5 border-b border-white/5 hover:border-white/15 transition-colors"
                      >
                        <div>
                          <div className="font-medium tracking-wide">{team.name}</div>
                          <div className="text-white/30 font-mono text-[10px] mt-1 flex items-center gap-3">
                            <span>{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
                            <span className="opacity-50">·</span>
                            <span className="flex items-center gap-1"><Link size={10} /> {team.invite_code}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-white/25 px-3 py-1 border border-white/10 rounded-full">{team.invite_code}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              {/* Create + Join side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Create Team */}
                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><Plus size={12} /> Create a Team</h2>
                  <form onSubmit={createTeam} className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Team Name</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="e.g. Team Fusion"
                        className="w-full bg-transparent border-b border-white/15 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/50 transition-colors text-sm font-light"
                        required
                      />
                    </div>
                    {teamMsg && (
                      <p className={`text-xs font-light ${teamMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{teamMsg.text}</p>
                    )}
                    <button type="submit" className="h-11 px-7 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-2">
                      Create Team <ArrowRight size={14} />
                    </button>
                  </form>
                </section>

                {/* Join Team */}
                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><Link size={12} /> Join a Team</h2>
                  <form onSubmit={joinTeam} className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Invite Code</label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value)}
                        placeholder="e.g. INV-AB12CD34"
                        className="w-full bg-transparent border-b border-white/15 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/50 transition-colors text-sm font-mono"
                        required
                      />
                    </div>
                    {joinMsg && (
                      <p className={`text-xs font-light ${joinMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{joinMsg.text}</p>
                    )}
                    <button type="submit" className="h-11 px-7 rounded-full border border-white/15 text-white text-xs font-medium uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2">
                      Join Team <ArrowRight size={14} />
                    </button>
                  </form>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'submit' && (
            <motion.div key="submit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-12">Project Submission</h2>
              <form onSubmit={submitProject} className="space-y-10">
                {[
                  { label: 'Project Title', val: subTitle, set: setSubTitle, placeholder: 'e.g. HorizonAI', required: true },
                  { label: 'Repository URL', val: subRepo, set: setSubRepo, placeholder: 'https://github.com/...', required: false },
                ].map(field => (
                  <div key={field.label} className="flex flex-col gap-2 border-b border-white/10 pb-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">{field.label}</label>
                    <input
                      type="text"
                      value={field.val}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full bg-transparent py-3 text-white placeholder:text-white/20 focus:outline-none transition-colors text-sm font-light"
                    />
                  </div>
                ))}

                <div className="flex flex-col gap-2 border-b border-white/10 pb-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Summary</label>
                  <textarea
                    value={subSummary}
                    onChange={e => setSubSummary(e.target.value)}
                    placeholder="Brief description of what you built..."
                    rows={4}
                    className="w-full bg-transparent py-3 text-white placeholder:text-white/20 focus:outline-none transition-colors text-sm font-light resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Track</label>
                    <select
                      value={subTrack}
                      onChange={e => setSubTrack(e.target.value)}
                      required
                      className="w-full bg-transparent border-b border-white/15 py-3 text-white focus:outline-none focus:border-white/50 transition-colors text-sm font-light [&>option]:bg-[#0a0d12]"
                    >
                      <option value="">Select track</option>
                      {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Team</label>
                    <select
                      value={subTeam}
                      onChange={e => setSubTeam(e.target.value)}
                      required
                      className="w-full bg-transparent border-b border-white/15 py-3 text-white focus:outline-none focus:border-white/50 transition-colors text-sm font-light [&>option]:bg-[#0a0d12]"
                    >
                      <option value="">Select team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                {subMsg && (
                  <p className={`text-xs font-light ${subMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{subMsg.text}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`h-14 px-10 rounded-full text-xs font-medium uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                    submitting ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Project'} <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
