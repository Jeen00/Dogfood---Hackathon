import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, UsersThree, Clock, Binoculars } from '@phosphor-icons/react'
import Navbar from '../components/Navbar'
import { PageContainer, DarkCard, Heading } from '../components/Theme'

export default function FAQPage() {
  const navigate = useNavigate()
  
  const faqs = [
    {
      q: 'Who can participate?',
      a: 'DOGFOOD 2026 is open to developers, designers, and innovators worldwide. You can join solo or in teams of up to 4.',
      icon: UserPlus,
      iconColor: 'text-sky-400',
      hoverBg: 'hover:bg-sky-500/40',
      iconContainer: 'bg-sky-400/10 border-sky-400/20 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
    },
    {
      q: 'How are teams formed?',
      a: 'You can create a team in your portal and share your unique invite code with friends.',
      icon: UsersThree,
      iconColor: 'text-amber-400',
      hoverBg: 'hover:bg-amber-500/40',
      iconContainer: 'bg-amber-400/10 border-amber-400/20 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
    },
    {
      q: 'When do submissions close?',
      a: 'Submissions strictly close at the deadline. Late submissions are automatically rejected by the platform.',
      icon: Clock,
      iconColor: 'text-rose-400',
      hoverBg: 'hover:bg-rose-500/40',
      iconContainer: 'bg-rose-400/10 border-rose-400/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
    },
    {
      q: 'Can I see other projects?',
      a: 'Yes! The public Gallery is continuously updated with all submitted projects and eventually, the final scores.',
      icon: Binoculars,
      iconColor: 'text-fuchsia-400',
      hoverBg: 'hover:bg-fuchsia-500/40',
      iconContainer: 'bg-fuchsia-400/10 border-fuchsia-400/20 text-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.2)]'
    }
  ]

  return (
    <PageContainer>
      <Navbar />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 flex flex-col gap-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6 mb-8"
        >
          <Heading className="md:text-6xl text-4xl">
            Frequently Asked
          </Heading>
          <p className="text-white/60 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
            Everything you need to know about participating, teaming up, and the project gallery.
          </p>
        </motion.div>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {faqs.map((faq, index) => {
            

            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="h-full"
              >
                <DarkCard hoverColor={faq.hoverBg} className="h-full flex flex-col relative overflow-hidden transition-colors duration-500 rounded-2xl" >
                  <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-6">
                      <div className={`flex items-center justify-center p-3.5 rounded-2xl border ${faq.iconContainer}`}>
                        <faq.icon size={28} weight="duotone" className={faq.iconColor} />
                      </div>
                      <h3 className="text-xl font-semibold tracking-wide text-white">{faq.q}</h3>
                    </div>
                    <p className="font-light text-base leading-relaxed text-white/70">
                      {faq.a}
                    </p>
                  </div>
                </DarkCard>
              </motion.div>
            )
          })}
        </div>

      </div>
    </PageContainer>
  )
}
