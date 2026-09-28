import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { motion } from 'motion/react'

export default function ScorePage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [project, setProject] = useState(location.state?.project || null)
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(!project)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/judge/assignments/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.project && !project) setProject(data.project)
        if (data.criteria) setCriteria(data.criteria)
        if (data.score) {
          setScores(data.score.criteria_scores || {})
          setComment(data.score.comment || '')
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [id, project])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/judge/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, criteria_scores: scores, comment })
      })
      if (res.ok) {
        navigate('/judge/dashboard')
      } else {
        alert('Failed to submit score')
      }
    } catch (err) {
      alert('Error submitting score')
    }
    setSubmitting(false)
  }

  const allScored = criteria.every(c => scores[c.name])
  const weightedScore = criteria.reduce((sum, c) => sum + (scores[c.name] || 0) * c.weight, 0).toFixed(2)

  if (loading) return (
    <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center">
      <div className="flex items-center gap-3 text-white/30 font-light uppercase tracking-widest text-xs">
        <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" />
        Loading...
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => navigate('/judge/dashboard')}
            className="group flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-20 pb-12 border-b border-white/10">
          <h1 className="text-4xl md:text-5xl font-light tracking-wide mb-4">{project.title}</h1>
          <p className="text-white/40 font-mono text-xs uppercase tracking-widest">ID: {id}</p>
        </header>

        <form className="space-y-16" onSubmit={handleSubmit}>
          
          <div className="space-y-12">
            {criteria.map((c, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                key={c.name} 
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <label className="text-sm font-light tracking-widest uppercase text-white/80">{c.name}</label>
                  <span className="text-[10px] font-medium tracking-[0.2em] text-white/30 uppercase">
                    Weight {c.weight * 100}%
                  </span>
                </div>
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setScores(s => ({ ...s, [c.name]: val }))}
                      className={`flex-1 py-4 flex items-center justify-center transition-all cursor-pointer border-b-2 ${
                        scores[c.name] === val 
                          ? 'border-white text-white bg-white/5' 
                          : 'border-transparent text-white/30 hover:bg-white/[0.02] hover:text-white/60'
                      }`}
                    >
                      <span className="font-light text-xl">{val}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-6 pt-8 border-t border-white/10"
          >
            <label className="text-sm font-light tracking-widest uppercase text-white/80 block">Qualitative Feedback</label>
            <textarea 
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Provide constructive feedback for the team..."
              className="w-full bg-transparent border-b border-white/10 p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/50 transition-colors resize-none font-light leading-relaxed"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-12"
          >
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-2">Final Weighted Score</div>
              <div className="text-4xl font-light">{weightedScore} <span className="text-white/20 text-2xl">/ 5.00</span></div>
            </div>

            <button 
              type="submit"
              disabled={!allScored || submitting}
              className={`h-14 px-10 rounded-full text-xs font-medium uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                !allScored || submitting
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.2)]'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Evaluation'}
              <Check size={16} />
            </button>
          </motion.div>
        </form>
      </main>
    </div>
  )
}
