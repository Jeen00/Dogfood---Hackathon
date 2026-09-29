import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, Plus, Users, Link, Send, Trophy, LayoutDashboard, Copy, CheckCircle2, History, MessageSquareText } from 'lucide-react'
import { PageContainer, DarkCard, WhiteCard, Heading, Label, Input, Select, PrimaryButton, SecondaryButton } from '../components/Theme'

export default function ParticipantDashboard() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
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
    // Fix browser back button so it doesn't log out
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    
    fetchData();

    return () => window.removeEventListener('popstate', handlePopState);
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
    <PageContainer className="min-h-screen text-white font-sans selection:bg-white/30 overflow-y-auto">
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 ">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between ">
          <div className="flex items-center gap-4">
            <span className="font-bold tracking-[0.2em] text-sm uppercase">DOGFOOD<span className="opacity-50">2026</span></span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/projects')} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Gallery</button>
            <button onClick={() => { fetch('/auth/logout', { method: 'POST' }).then(() => navigate('/login')) }} className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">Log Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-20 w-full relative z-10 ">
        <div className="mb-12 border-b border-white/10 pb-10 ">
          <Heading className="mb-4">Participant Hub</Heading>
          <p className="text-white/40 font-light text-sm max-w-xl leading-relaxed">
            Manage your teams, view previous hackathons, and check your project's feedback and leaderboard standing.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex flex-wrap gap-8 mb-16 border-b border-white/10 ">
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
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 ">
              <section className=" ">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><LayoutDashboard size={12}/> Ongoing Hackathons</h2>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 transition-colors hover:bg-emerald-500/20 ">
                  <div className=" ">
                    <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1 mb-3 inline-block ">Live Now</span>
                    <h3 className="text-2xl font-light tracking-wide mb-1 text-white">DOGFOOD Hackathon 2026</h3>
                    <p className="text-white/60 text-sm font-light">Build the platform that will judge you.</p>
                  </div>
                  <PrimaryButton onClick={() => setActiveTab('team')} className="uppercase tracking-widest ">
                    Form a Team
                  </PrimaryButton>
                </div>
              </section>

              <section className=" ">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2"><History size={12}/> Previous Participations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                  {/* Mock Previous Hackathon 1 */}
                  <div className="flex flex-col justify-between gap-6 p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 transition-colors hover:bg-amber-500/20 ">
                    <div className="flex justify-between items-start ">
                      <div className=" ">
                        <h4 className="text-lg font-medium tracking-wide mb-1 text-white">AI Spring Hackathon 2025</h4>
                        <p className="text-white/40 text-xs">Project: "Neural Net Visualizer"</p>
                      </div>
                      <div className="text-white/30 text-[10px] font-mono tracking-widest uppercase ">Mar '25</div>
                    </div>
                    <div className="flex items-center gap-3 ">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-amber-400 bg-amber-400/10 px-3 py-1 ">Top 10 Finalist</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40 ">Score: 4.6/5</span>
                    </div>
                  </div>

                  {/* Mock Previous Hackathon 2 */}
                  <div className="flex flex-col justify-between gap-6 p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 transition-colors hover:bg-white/10 ">
                    <div className="flex justify-between items-start ">
                      <div className=" ">
                        <h4 className="text-lg font-medium tracking-wide mb-1 text-white">Winter Web3 Jam 2024</h4>
                        <p className="text-white/40 text-xs">Project: "Decentralized Auth"</p>
                      </div>
                      <div className="text-white/30 text-[10px] font-mono tracking-widest uppercase ">Dec '24</div>
                    </div>
                    <div className="flex items-center gap-3 ">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-white/40 bg-white/5 px-3 py-1 border border-white/10 ">Participant</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40 ">Score: 3.8/5</span>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 ">
              <section className=" ">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 ">Your Active Teams</h2>
                {loading ? (
                  <div className="text-white/30 text-sm font-light ">Loading...</div>
                ) : teams.length === 0 ? (
                  <div className="py-12 text-center text-white/30 font-light text-sm border border-dashed border-white/10 ">
                    You are not part of any team yet. Create one or join below.
                  </div>
                ) : (
                  <div className="space-y-6 ">
                    {teams.map((team, i) => (
                      <div key={team.id} className="p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 ">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-white/10 ">
                          <div className=" ">
                            <h3 className="text-2xl sm:text-3xl font-light tracking-[0.15em] uppercase text-white mb-2">{team.name}</h3>
                            <div className="text-white/60 text-sm flex items-center gap-3 ">
                              <Users size={14} /> {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          {/* Team Leader Invite Code Section */}
                          <div className="flex flex-col items-start md:items-end gap-2 ">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 ">Share this code with friends to join</span>
                            <div className="flex items-center gap-3 bg-black/20 border border-white/10 px-4 py-2 ">
                              <span className="font-mono text-sm tracking-wider text-emerald-400 ">{team.invite_code}</span>
                              <button onClick={() => copyCode(team.invite_code)} className="text-white/40 hover:text-white transition-colors ">
                                {copiedCode === team.invite_code ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 ">
                          <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-4 ">Team Roster</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ">
                            {[
                              { name: 'You (Team Leader)', role: 'Full Stack', status: 'Active' },
                              { name: 'Waiting for members...', role: 'Pending', status: 'Idle' }
                            ].map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 ">
                                <div className="flex items-center gap-3 ">
                                  <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-xs font-medium text-white/70 ">
                                    {m.name.charAt(0)}
                                  </div>
                                  <div className=" ">
                                    <div className="text-sm font-medium text-white/90 ">{m.name}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/50 ">{m.role}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest ${m.status === 'Active' ? 'text-emerald-400' : 'text-white/40'}`}>
                                  {m.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Create + Join side by side - Minimalist Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 ">
                <div className="p-8 bg-transparent border border-white/10 ">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2 "><Plus size={12} /> Create a Team</h2>
                  <form onSubmit={createTeam} className="space-y-6 ">
                    <div className="flex flex-col gap-2 ">
                      <Label className=" ">Team Name</Label>
                      <Input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Team Fusion" required className=" " />
                    </div>
                    {teamMsg && <p className={`text-xs font-light ${teamMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{teamMsg.text}</p>}
                    <PrimaryButton type="submit" className="flex items-center justify-center gap-2 ">Create Team <ArrowRight size={14} /></PrimaryButton>
                  </form>
                </div>

                <div className="p-8 bg-transparent border border-white/10 ">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2 "><Link size={12} /> Join a Team</h2>
                  <form onSubmit={joinTeam} className="space-y-6 ">
                    <div className="flex flex-col gap-2 ">
                      <Label className=" ">Invite Code</Label>
                      <Input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="e.g. INV-AB12CD34" required className="font-mono " />
                    </div>
                    {joinMsg && <p className={`text-xs font-light ${joinMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{joinMsg.text}</p>}
                    <SecondaryButton type="submit" className=" ">Join Team <ArrowRight size={14} /></SecondaryButton>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUBMISSION & FEEDBACK TAB */}
          {activeTab === 'submission' && (
            <motion.div key="submission" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 ">
              
              {/* Submission Form */}
              <div className="max-w-2xl mx-auto w-full p-8 bg-transparent border border-white/10 ">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2 "><Send size={12}/> Submit Project</h2>
                <form onSubmit={submitProject} className="space-y-8 ">
                  <div className="flex flex-col gap-2 ">
                    <Label className=" ">Project Title</Label>
                    <Input type="text" value={subTitle} onChange={e => setSubTitle(e.target.value)} placeholder="e.g. HorizonAI" required className=" " />
                  </div>
                  <div className="flex flex-col gap-2 ">
                    <Label className=" ">Repository URL</Label>
                    <Input type="text" value={subRepo} onChange={e => setSubRepo(e.target.value)} placeholder="https://github.com/..." className=" " />
                  </div>
                  <div className="flex flex-col gap-2 ">
                    <Label className=" ">Summary</Label>
                    <textarea value={subSummary} onChange={e => setSubSummary(e.target.value)} placeholder="Brief description of what you built..." rows={4} className="w-full bg-white/[0.08] border border-white/15 p-4 text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 transition-all text-sm font-light tracking-wide resize-none leading-relaxed" />
                  </div>
                  <div className="grid grid-cols-2 gap-8 ">
                    <div className="flex flex-col gap-2 ">
                      <Label className=" ">Track</Label>
                      <Select value={subTrack} onChange={e => setSubTrack(e.target.value)} required className=" ">
                        <option value="">Select track</option>
                        {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2 ">
                      <Label className=" ">Team</Label>
                      <Select value={subTeam} onChange={e => setSubTeam(e.target.value)} required className=" ">
                        <option value="">Select team</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </div>
                  </div>
                  {subMsg && <p className={`text-xs font-light ${subMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{subMsg.text}</p>}
                  <PrimaryButton type="submit" disabled={submitting} className={`flex items-center justify-center gap-3 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {submitting ? 'Submitting...' : 'Submit Project'} <Send size={14} />
                  </PrimaryButton>
                </form>
              </div>

              {/* Judges Feedback Section */}
              <section className="pt-8 ">
                <div className="flex items-center justify-between mb-8 ">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 flex items-center gap-2 "><MessageSquareText size={12}/> Judges' Remarks & Scores</h2>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-sky-400 bg-sky-400/10 px-3 py-1 ">Evaluated</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
                  {mockFeedback.map((fb, i) => (
                    <div key={i} className="flex flex-col p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 ">
                      <div className="flex justify-between items-center mb-4 ">
                        <span className="text-xs text-white/60 uppercase tracking-widest ">{fb.criteria}</span>
                        <span className="text-lg font-light text-white ">{fb.score}<span className="text-white/40 text-xs ">/5</span></span>
                      </div>
                      <p className="text-sm font-light text-white/80 leading-relaxed italic flex-1 ">"{fb.remark}"</p>
                      <div className="mt-6 text-[10px] uppercase tracking-widest text-white/40 ">— {fb.judge}</div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 ">
              <div className="flex items-center justify-between ">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 flex items-center gap-2 "><Trophy size={12}/> Event Leaderboard</h2>
                <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-fuchsia-400 bg-fuchsia-400/10 px-3 py-1 ">Normalized Scores</span>
              </div>
              
              <div className="overflow-hidden p-0 sm:p-0 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 ">
                <table className="w-full text-left border-collapse ">
                  <thead className=" ">
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/50 ">
                      <th className="py-5 px-8 font-medium ">Rank</th>
                      <th className="py-5 px-8 font-medium ">Team</th>
                      <th className="py-5 px-8 font-medium ">Project</th>
                      <th className="py-5 px-8 font-medium text-right ">Score</th>
                    </tr>
                  </thead>
                  <tbody className=" ">
                    {mockLeaderboard.map((item, i) => (
                      <tr key={i} className={`border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${item.team === 'Your Team' ? 'bg-white text-black' : ''}`}>
                        <td className={`py-5 px-8 text-lg font-light ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-400' : item.team === 'Your Team' ? 'text-black' : 'text-white/40'}`}>#{item.rank}</td>
                        <td className="py-5 px-8 text-sm font-medium ">{item.team} {item.team === 'Your Team' && <span className="ml-2 text-[10px] uppercase tracking-widest text-black bg-black/10 px-2 py-0.5 border border-black/20">You</span>}</td>
                        <td className={`py-5 px-8 text-sm ${item.team === 'Your Team' ? 'text-black/60' : 'text-white/60'}`}>{item.project}</td>
                        <td className="py-5 px-8 text-right font-light text-lg ">{item.score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageContainer>
  )
}
