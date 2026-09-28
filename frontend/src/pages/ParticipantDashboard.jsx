import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, Plus, Users, Link, Send, Trophy, LayoutDashboard, Copy, CheckCircle2, History, MessageSquareText } from 'lucide-react'

export default function ParticipantDashboard() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // overview | team | submission | leaderboard
  const [copiedCode, setCopiedCode] = useState(false)

  // Team creation & joining
  const [teamName, setTeamName] = useState('')
  const [teamMsg, setTeamMsg] = useState(null)
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

  // Mock data for new features (to be wired to backend later)
  const [mockLeaderboard] = useState([
    { rank: 1, team: 'CyberPioneers', project: 'Autonomous Multi-Agent Orchestrator', score: 4.8 },
    { rank: 2, team: 'NeuralSync Labs', project: 'Edge Cloud Devbox', score: 4.5 },
    { rank: 3, team: 'Quantum Minds', project: 'Quantum Entanglement Visualizer', score: 4.2 },
    { rank: 4, team: 'Your Team', project: 'Waiting for Evaluation...', score: null },
  ])

  const [mockFeedback] = useState([
    { judge: 'Judge A', criteria: 'Functionality', score: 4, remark: 'Solid core loop, but occasionally hallucinates on edge cases.' },
    { judge: 'Judge B', criteria: 'Quality', score: 5, remark: 'Exceptional code structure and very clean architecture.' },
    { judge: 'Judge A', criteria: 'Presentation', score: 4, remark: 'Great demo, clearly explained the value proposition.' },
  ])

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

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(false), 2000)
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
            <button onClick={() => navigate('/projects')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Gallery</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12 border-b border-white/10 pb-10">
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase mb-4">Participant Hub</h1>
          <p className="text-white/40 font-light text-sm max-w-xl leading-relaxed">
            Manage your teams, view previous hackathons, and check your project's feedback and leaderboard standing.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex flex-wrap gap-8 mb-16 border-b border-white/10">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'team', label: 'My Team', icon: Users },
            { id: 'submission', label: 'Project & Feedback', icon: Send },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
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
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16">
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><LayoutDashboard size={12}/> Ongoing Hackathons</h2>
                <div className="p-8 border border-white/10 rounded-[32px] bg-white/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full mb-3 inline-block">Live Now</span>
                    <h3 className="text-2xl font-light tracking-wide mb-1">DOGFOOD Hackathon 2026</h3>
                    <p className="text-white/40 text-sm font-light">Build the platform that will judge you.</p>
                  </div>
                  <button onClick={() => setActiveTab('team')} className="px-6 py-3 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all">
                    Form a Team
                  </button>
                </div>
              </section>

              <section>
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><History size={12}/> Previous Participations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mock Previous Hackathon 1 */}
                  <div className="p-6 border border-white/5 rounded-[24px] bg-white/[0.01] flex flex-col justify-between gap-6 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium tracking-wide mb-1 text-white">AI Spring Hackathon 2025</h4>
                        <p className="text-white/40 text-xs">Project: "Neural Net Visualizer"</p>
                      </div>
                      <div className="text-white/30 text-[10px] font-mono tracking-widest uppercase">Mar '25</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">Top 10 Finalist</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40">Score: 4.6/5</span>
                    </div>
                  </div>

                  {/* Mock Previous Hackathon 2 */}
                  <div className="p-6 border border-white/5 rounded-[24px] bg-white/[0.01] flex flex-col justify-between gap-6 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium tracking-wide mb-1 text-white">Winter Web3 Jam 2024</h4>
                        <p className="text-white/40 text-xs">Project: "Decentralized Auth"</p>
                      </div>
                      <div className="text-white/30 text-[10px] font-mono tracking-widest uppercase">Dec '24</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">Participant</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40">Score: 3.8/5</span>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16">
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8">Your Active Teams</h2>
                {loading ? (
                  <div className="text-white/30 text-sm font-light">Loading...</div>
                ) : teams.length === 0 ? (
                  <div className="py-12 text-center text-white/30 font-light text-sm border border-dashed border-white/10 rounded-[24px]">
                    You are not part of any team yet. Create one or join below.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {teams.map((team, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        key={team.id}
                        className="p-8 border border-white/10 rounded-[32px] bg-white/[0.02]"
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-white/5">
                          <div>
                            <div className="text-2xl font-light tracking-wide mb-2">{team.name}</div>
                            <div className="text-white/40 text-sm flex items-center gap-3">
                              <Users size={14} /> {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          {/* Team Leader Invite Code Section */}
                          <div className="flex flex-col items-start md:items-end gap-2">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">Share this code with friends to join</span>
                            <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-full px-4 py-2">
                              <span className="font-mono text-sm tracking-wider text-emerald-300">{team.invite_code}</span>
                              <button onClick={() => copyCode(team.invite_code)} className="text-white/40 hover:text-white transition-colors">
                                {copiedCode === team.invite_code ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="pt-6">
                          <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Team Roster</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* In a real scenario, this would map over team.members */}
                            {[
                              { name: 'You (Team Leader)', role: 'Full Stack', status: 'Active' },
                              { name: 'Waiting for members...', role: 'Pending', status: 'Idle' }
                            ].map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 rounded-[16px] bg-white/[0.01] border border-white/5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/70">
                                    {m.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-white/90">{m.name}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/30">{m.role}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest ${m.status === 'Active' ? 'text-emerald-400' : 'text-white/20'}`}>
                                  {m.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              {/* Create + Join side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><Plus size={12} /> Create a Team</h2>
                  <form onSubmit={createTeam} className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Team Name</label>
                      <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Team Fusion" required className="w-full bg-transparent border-b border-white/15 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/50 transition-colors text-sm font-light" />
                    </div>
                    {teamMsg && <p className={`text-xs font-light ${teamMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{teamMsg.text}</p>}
                    <button type="submit" className="h-11 px-7 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-2">Create Team <ArrowRight size={14} /></button>
                  </form>
                </section>

                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><Link size={12} /> Join a Team</h2>
                  <form onSubmit={joinTeam} className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Invite Code</label>
                      <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="e.g. INV-AB12CD34" required className="w-full bg-transparent border-b border-white/15 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/50 transition-colors text-sm font-mono" />
                    </div>
                    {joinMsg && <p className={`text-xs font-light ${joinMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{joinMsg.text}</p>}
                    <button type="submit" className="h-11 px-7 rounded-full border border-white/15 text-white text-xs font-medium uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2">Join Team <ArrowRight size={14} /></button>
                  </form>
                </section>
              </div>
            </motion.div>
          )}

          {/* SUBMISSION & FEEDBACK TAB */}
          {activeTab === 'submission' && (
            <motion.div key="submission" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16">
              
              {/* Submission Form */}
              <section className="max-w-2xl">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><Send size={12}/> Submit Project</h2>
                <form onSubmit={submitProject} className="space-y-10">
                  <div className="flex flex-col gap-2 border-b border-white/10 pb-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Project Title</label>
                    <input type="text" value={subTitle} onChange={e => setSubTitle(e.target.value)} placeholder="e.g. HorizonAI" required className="w-full bg-transparent py-3 text-white placeholder:text-white/20 focus:outline-none transition-colors text-sm font-light" />
                  </div>
                  <div className="flex flex-col gap-2 border-b border-white/10 pb-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Repository URL</label>
                    <input type="text" value={subRepo} onChange={e => setSubRepo(e.target.value)} placeholder="https://github.com/..." className="w-full bg-transparent py-3 text-white placeholder:text-white/20 focus:outline-none transition-colors text-sm font-light" />
                  </div>
                  <div className="flex flex-col gap-2 border-b border-white/10 pb-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Summary</label>
                    <textarea value={subSummary} onChange={e => setSubSummary(e.target.value)} placeholder="Brief description of what you built..." rows={4} className="w-full bg-transparent py-3 text-white placeholder:text-white/20 focus:outline-none transition-colors text-sm font-light resize-none leading-relaxed" />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Track</label>
                      <select value={subTrack} onChange={e => setSubTrack(e.target.value)} required className="w-full bg-transparent border-b border-white/15 py-3 text-white focus:outline-none transition-colors text-sm font-light [&>option]:bg-[#0a0d12]">
                        <option value="">Select track</option>
                        {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Team</label>
                      <select value={subTeam} onChange={e => setSubTeam(e.target.value)} required className="w-full bg-transparent border-b border-white/15 py-3 text-white focus:outline-none transition-colors text-sm font-light [&>option]:bg-[#0a0d12]">
                        <option value="">Select team</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {subMsg && <p className={`text-xs font-light ${subMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{subMsg.text}</p>}
                  <button type="submit" disabled={submitting} className={`h-14 px-10 rounded-full text-xs font-medium uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${submitting ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]'}`}>
                    {submitting ? 'Submitting...' : 'Submit Project'} <Send size={14} />
                  </button>
                </form>
              </section>

              {/* Judges Feedback Section (Mocked for now) */}
              <section className="pt-16 border-t border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 flex items-center gap-2"><MessageSquareText size={12}/> Judges' Remarks & Scores</h2>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-sky-400 bg-sky-400/10 px-3 py-1 rounded-full">Evaluated</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {mockFeedback.map((fb, i) => (
                    <div key={i} className="p-6 border border-white/10 rounded-[24px] bg-white/[0.02]">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs text-white/40 uppercase tracking-widest">{fb.criteria}</span>
                        <span className="text-lg font-light text-white">{fb.score}<span className="text-white/30 text-xs">/5</span></span>
                      </div>
                      <p className="text-sm font-light text-white/70 leading-relaxed italic">"{fb.remark}"</p>
                      <div className="mt-6 text-[10px] uppercase tracking-widest text-white/20">— {fb.judge}</div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 flex items-center gap-2"><Trophy size={12}/> Event Leaderboard</h2>
                <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-fuchsia-400 bg-fuchsia-400/10 px-3 py-1 rounded-full">Normalized Scores</span>
              </div>
              
              <div className="w-full border border-white/10 rounded-[32px] overflow-hidden bg-white/[0.01]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/30">
                      <th className="py-5 px-8 font-medium">Rank</th>
                      <th className="py-5 px-8 font-medium">Team</th>
                      <th className="py-5 px-8 font-medium">Project</th>
                      <th className="py-5 px-8 font-medium text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLeaderboard.map((item, i) => (
                      <tr key={i} className={`border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${item.team === 'Your Team' ? 'bg-white/[0.04]' : ''}`}>
                        <td className={`py-5 px-8 text-lg font-light ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-700' : 'text-white/30'}`}>#{item.rank}</td>
                        <td className="py-5 px-8 text-sm font-medium">{item.team} {item.team === 'Your Team' && <span className="ml-2 text-[10px] uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">You</span>}</td>
                        <td className="py-5 px-8 text-sm text-white/50">{item.project}</td>
                        <td className="py-5 px-8 text-right font-light text-lg">{item.score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
