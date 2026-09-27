import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Scales, Globe } from '@phosphor-icons/react'
import DinoIcon from '../components/DinoIcon'

export default function RulesPage() {
  const navigate = useNavigate()
  
  return (
    <main className="relative flex flex-col min-h-screen w-full bg-[#0a0d12] text-white font-sans selection:bg-white/30">
      
      {/* Background Video */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4"
          type="video/mp4"
        />
      </video>

      {/* Navigation Bar */}
      <nav className="relative z-50 w-full flex items-center justify-between backdrop-blur-xl border-b border-white/10 px-8 py-5 bg-black/40">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
          <button className="text-white/60 hover:text-white transition-colors bg-transparent border-none">
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="h-6 w-px bg-white/20" />
          <div className="relative flex flex-col items-center">
            <DinoIcon className="w-10 h-8 -ml-1 text-white" style={{ fill: 'currentColor' }} />
            <div className="w-8 h-[2px] mt-0.5 bg-white" />
          </div>
          <span className="font-bold tracking-[0.15em] text-lg uppercase flex items-start gap-1 text-white">
            DOGFOOD<span className="text-[10px] mt-0.5 opacity-60">®</span>
          </span>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 flex flex-col gap-16 overflow-y-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6"
        >
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.15em] uppercase">
            Official Rules
          </h1>
          <p className="text-white/60 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
            Comprehensive guidelines for participants building the future, judges evaluating merit, and visitors observing the process.
          </p>
        </motion.div>

        {/* Participants Rules */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-2xl font-semibold tracking-wider uppercase mb-8 flex items-center gap-5">
              <div className="flex items-center justify-center p-3.5 rounded-2xl bg-sky-400/10 border border-sky-400/20 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                <User size={32} weight="duotone" />
              </div>
              For Participants
            </h2>
            <ul className="space-y-6 text-white/80 font-light text-lg leading-relaxed">
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                <p><strong>Track-Based Submission:</strong> Teams must submit their projects into specific defined tracks (e.g., Security, AI, UI/UX). Your project will only be judged against others in the same track.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                <p><strong>Code Repositories:</strong> A valid public repository link must be provided. Code quality and architecture are factored into your final score.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                <p><strong>Audit Logging:</strong> You may edit your submission until the deadline, but all changes (including team formation and updates) are securely recorded in the platform's immutable Audit Trail.</p>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Judges Rules */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-2xl font-semibold tracking-wider uppercase mb-8 flex items-center gap-5">
              <div className="flex items-center justify-center p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                <Scales size={32} weight="duotone" />
              </div>
              For Judges
            </h2>
            <ul className="space-y-6 text-white/80 font-light text-lg leading-relaxed">
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                <p><strong>Strict Role Isolation:</strong> Judges are only assigned to projects within their domain expertise. You cannot view scores submitted by other judges, ensuring independent evaluation.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                <p><strong>The Weighted Rubric:</strong> Every project must be evaluated on a 1-5 integer scale across three criteria: <em className="text-white">Functionality (50%)</em>, <em className="text-white">Quality (30%)</em>, and <em className="text-white">Presentation (20%)</em>.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                <p><strong>Z-Score Normalization:</strong> Do not worry if you are naturally a "strict" or "generous" grader. The platform automatically calculates your personal mean and standard deviation, converting your raw scores into normalized Z-scores to completely eliminate bias across the judging pool.</p>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Visitors Rules */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-2xl font-semibold tracking-wider uppercase mb-8 flex items-center gap-5">
              <div className="flex items-center justify-center p-3.5 rounded-2xl bg-fuchsia-400/10 border border-fuchsia-400/20 text-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.2)]">
                <Globe size={32} weight="duotone" />
              </div>
              For Visitors & Organizers
            </h2>
            <ul className="space-y-6 text-white/80 font-light text-lg leading-relaxed">
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-fuchsia-400 flex-shrink-0 shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
                <p><strong>Public Audit Trail:</strong> Once the event concludes, all normalized scores, track assignments, and mathematical adjustments are published in the open gallery for 100% transparent verification.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-2 w-2 h-2 rounded-full bg-fuchsia-400 flex-shrink-0 shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
                <p><strong>Data Export:</strong> Organizers have access to one-click CSV exports of the final scoring matrix to easily distribute prizes and awards based on pure merit.</p>
              </li>
            </ul>
          </div>
        </motion.div>

      </div>
    </main>
  )
}
