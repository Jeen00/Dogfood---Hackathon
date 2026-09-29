import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { User, Scales, Globe } from '@phosphor-icons/react'
import Navbar from '../components/Navbar'
import { PageContainer, Heading, DarkCard } from '../components/Theme'

export default function RulesPage() {
  const navigate = useNavigate()
  
  const ruleCards = [
    {
      title: 'For Participants',
      icon: User,
      iconColor: 'text-sky-400',
      hoverBg: 'hover:bg-sky-500/40',
      iconContainer: 'bg-sky-400/10 border-sky-400/20 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]',
      dot: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]',
      rules: [
        { label: 'Track-Based Submission:', text: 'Teams must submit their projects into specific defined tracks (e.g., Security, AI, UI/UX). Your project will only be judged against others in the same track.' },
        { label: 'Code Repositories:', text: 'A valid public repository link must be provided. Code quality and architecture are factored into your final score.' },
        { label: 'Audit Logging:', text: 'You may edit your submission until the deadline, but all changes (including team formation and updates) are securely recorded in the platform\'s immutable Audit Trail.' }
      ]
    },
    {
      title: 'For Judges',
      icon: Scales,
      iconColor: 'text-amber-400',
      hoverBg: 'hover:bg-amber-500/40',
      iconContainer: 'bg-amber-400/10 border-amber-400/20 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]',
      dot: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]',
      rules: [
        { label: 'Strict Role Isolation:', text: 'Judges are only assigned to projects within their domain expertise. You cannot view scores submitted by other judges, ensuring independent evaluation.' },
        { label: 'The Weighted Rubric:', text: 'Every project must be evaluated on a 1-5 integer scale across three criteria: Functionality (50%), Quality (30%), and Presentation (20%).', hasMarkup: true },
        { label: 'Z-Score Normalization:', text: 'Do not worry if you are naturally a "strict" or "generous" grader. The platform automatically calculates your personal mean and standard deviation, converting your raw scores into normalized Z-scores to completely eliminate bias across the judging pool.' }
      ]
    },
    {
      title: 'For Visitors & Organizers',
      icon: Globe,
      iconColor: 'text-fuchsia-400',
      hoverBg: 'hover:bg-fuchsia-500/40',
      iconContainer: 'bg-fuchsia-400/10 border-fuchsia-400/20 text-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.2)]',
      dot: 'bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.5)]',
      rules: [
        { label: 'Public Audit Trail:', text: 'Once the event concludes, all normalized scores, track assignments, and mathematical adjustments are published in the open gallery for 100% transparent verification.' },
        { label: 'Data Export:', text: 'Organizers have access to one-click CSV exports of the final scoring matrix to easily distribute prizes and awards based on pure merit.' }
      ]
    }
  ]

  return (
    <PageContainer>
      <Navbar />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 flex flex-col gap-16">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6"
        >
          <Heading>
            Official Rules
          </Heading>
          <p className="text-white/60 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
            Comprehensive guidelines for participants building the future, judges evaluating merit, and visitors observing the process.
          </p>
        </motion.div>

        {/* Rules Cards */}
        {ruleCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <DarkCard className="md:p-12 relative overflow-hidden rounded-2xl" hoverColor={card.hoverBg}>
              <div className="relative z-10">
                <h2 className="text-2xl font-semibold tracking-wider uppercase mb-8 flex items-center gap-5 text-white">
                  <div className={`flex items-center justify-center p-3.5 rounded-2xl ${card.iconContainer}`}>
                    <card.icon size={32} weight="duotone" className={card.iconColor} />
                  </div>
                  {card.title}
                </h2>
                <ul className="space-y-6 text-white/80 font-light text-lg leading-relaxed">
                  {card.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className={`mt-2 w-2 h-2 rounded-2xl flex-shrink-0 ${card.dot}`} />
                      <p>
                        <strong>{rule.label}</strong>{' '}
                        {rule.hasMarkup ? (
                          <>Every project must be evaluated on a 1-5 integer scale across three criteria: <em className="text-white font-semibold">Functionality (50%)</em>, <em className="text-white font-semibold">Quality (30%)</em>, and <em className="text-white font-semibold">Presentation (20%)</em>.</>
                        ) : rule.text}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </DarkCard>
          </motion.div>
        ))}

      </div>
    </PageContainer>
  )
}
