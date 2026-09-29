import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { PageContainer, Heading, DarkCard, WhiteCard, Label, Input, PrimaryButton, SecondaryButton } from '../components/Theme'

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

  const allScored = criteria.length > 0 && criteria.every(c => scores[c.name])
  const weightedScore = criteria.reduce((sum, c) => sum + (scores[c.name] || 0) * c.weight, 0).toFixed(2)

  if (loading) return (
    <PageContainer>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/30 font-light uppercase tracking-widest text-xs">
          <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/80 animate-spin" />
          Loading...
        </div>
      </div>
    </PageContainer>
  )

  return (
    <PageContainer>
      <header className="sticky top-0 z-50 bg-[#0a0d12]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <SecondaryButton 
            onClick={() => navigate('/judge/dashboard')}
            className="!w-auto px-6 !h-10"
          >
            <ArrowLeft size={14} /> Back
          </SecondaryButton>
        </div>
      </header>

      <div className="max-w-4xl w-full mx-auto px-6 py-20 flex-1">
        
        <DarkCard className="mb-12">
          <Heading className="mb-2">{project?.title || 'Unknown Project'}</Heading>
          <p className="text-white/60 font-mono text-xs uppercase tracking-widest">ID: {id}</p>
        </DarkCard>

        <form className="space-y-8" onSubmit={handleSubmit}>
          
          <WhiteCard className="space-y-12">
            {criteria.map((c, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                key={c.name} 
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-black/10 pb-4">
                  <Label className="!text-black/80">{c.name}</Label>
                  <span className="text-[10px] font-medium tracking-[0.2em] text-black/40 uppercase">
                    Weight {c.weight * 100}%
                  </span>
                </div>
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setScores(s => ({ ...s, [c.name]: val }))}
                      className={`flex-1 py-4 flex items-center justify-center transition-all cursor-pointer rounded-2xl border-2 ${
                        scores[c.name] === val 
                          ? 'border-black text-white bg-black shadow-md' 
                          : 'border-transparent text-black/40 hover:bg-black/5 hover:text-black/70'
                      }`}
                    >
                      <span className="font-light text-xl">{val}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </WhiteCard>

          <DarkCard className="space-y-6">
            <div>
              <Label className="block mb-4">Qualitative Feedback</Label>
              <Input 
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Provide constructive feedback for the team..."
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-white/10 mt-8">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium mb-2">Final Weighted Score</div>
                <div className="text-4xl font-light text-white">{weightedScore} <span className="text-white/40 text-2xl">/ 5.00</span></div>
              </div>

              <PrimaryButton 
                type="submit"
                disabled={!allScored || submitting}
                className="w-full sm:w-auto px-10 flex items-center justify-center gap-3"
              >
                <span className="flex items-center gap-2">
                  {submitting ? 'Submitting...' : 'Submit Evaluation'}
                  <Check size={16} />
                </span>
              </PrimaryButton>
            </div>
          </DarkCard>
        </form>
      </div>
    </PageContainer>
  )
}
