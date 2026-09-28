import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

export default function RulesPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans p-8 md:p-24">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-12 hover:opacity-70 transition-opacity">
        <ArrowLeft size={20} /> Back to Home
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-light tracking-widest uppercase mb-8">Judging Rules & Transparency</h1>
        <p className="text-xl mb-6 opacity-80">We believe in 100% fair, transparent, and normalized scoring.</p>
        
        <div className="space-y-12 mt-16">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. The Weighted Rubric</h2>
            <p className="opacity-80 leading-relaxed">
              Every project is scored across three core criteria: <strong>Functionality (50%)</strong>, <strong>Quality (30%)</strong>, and <strong>Presentation (20%)</strong>. Judges submit raw scores from 1 to 5 for each category.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Z-Score Normalization</h2>
            <p className="opacity-80 leading-relaxed">
              To completely eliminate bias (e.g., one judge being notoriously strict and another being overly generous), all raw scores are mathematically normalized using a cross-judge Z-Score algorithm. This compares how a judge scored your project relative to their own personal baseline, ensuring absolute fairness across all tracks.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Public Audit Trail</h2>
            <p className="opacity-80 leading-relaxed">
              After the event concludes, all normalized scores and judge assignments are published in our open gallery. We believe hackathons should be won on merit, not luck of the draw.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
