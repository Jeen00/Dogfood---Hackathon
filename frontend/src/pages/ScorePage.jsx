import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CaretLeft, Star } from '@phosphor-icons/react'

export default function ScorePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Mock criteria matching the backend rubric
  const criteria = [
    { key: 'functionality', label: 'Functionality', weight: 0.5 },
    { key: 'quality', label: 'Code Quality', weight: 0.3 },
    { key: 'presentation', label: 'Presentation', weight: 0.2 }
  ]

  const [scores, setScores] = useState({ functionality: 0, quality: 0, presentation: 0 })
  const [comment, setComment] = useState('')

  const handleScore = (key, val) => setScores(s => ({ ...s, [key]: val }))

  const totalScore = (
    scores.functionality * 0.5 + 
    scores.quality * 0.3 + 
    scores.presentation * 0.2
  ).toFixed(2)

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate('/judge/dashboard')}
          className="text-white/50 hover:text-white text-sm mb-8 flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none"
        >
          <CaretLeft size={16} /> Back to Dashboard
        </button>

        <header className="mb-10 pb-10 border-b border-white/10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Scoring: Project {id}</h1>
          <p className="text-white/50">Please evaluate carefully based on the rubric.</p>
        </header>

        <form className="space-y-10" onSubmit={e => { e.preventDefault(); navigate('/judge/dashboard') }}>
          
          {criteria.map((c) => (
            <div key={c.key} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-medium">{c.label}</label>
                <span className="text-sm font-medium text-white/40 bg-white/5 px-2 py-1 rounded-md">
                  Weight: {c.weight * 100}%
                </span>
              </div>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleScore(c.key, val)}
                    className={`flex-1 py-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      scores[c.key] === val 
                        ? 'bg-white border-white text-black' 
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    <Star size={20} weight={scores[c.key] === val ? 'fill' : 'regular'} />
                    <span className="font-semibold">{val}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-4">
            <label className="text-lg font-medium block">Judge's Comment</label>
            <textarea 
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Provide constructive feedback..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-sm text-white/50 font-medium mb-1">Weighted Score</div>
              <div className="text-3xl font-bold">{totalScore} <span className="text-lg text-white/30">/ 5.00</span></div>
            </div>
            <button type="submit" className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform cursor-pointer">
              Submit Score
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
