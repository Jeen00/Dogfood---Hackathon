import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, UsersThree, Clock, Binoculars } from '@phosphor-icons/react'
import DinoIcon from '../components/DinoIcon'

export default function FAQPage() {
  const navigate = useNavigate()
  
  const faqs = [
    {
      q: 'Who can participate?',
      a: 'DOGFOOD 2026 is open to developers, designers, and innovators worldwide. You can join solo or in teams of up to 4.',
      icon: UserPlus,
      color: 'sky'
    },
    {
      q: 'How are teams formed?',
      a: 'You can create a team in your portal and share your unique invite code with friends.',
      icon: UsersThree,
      color: 'amber'
    },
    {
      q: 'When do submissions close?',
      a: 'Submissions strictly close at the deadline. Late submissions are automatically rejected by the platform.',
      icon: Clock,
      color: 'rose'
    },
    {
      q: 'Can I see other projects?',
      a: 'Yes! The public Gallery is continuously updated with all submitted projects and eventually, the final scores.',
      icon: Binoculars,
      color: 'fuchsia'
    }
  ]

  const colorMap = {
    sky: 'bg-sky-400/10 border-sky-400/20 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]',
    amber: 'bg-amber-400/10 border-amber-400/20 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]',
    rose: 'bg-rose-400/10 border-rose-400/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    fuchsia: 'bg-fuchsia-400/10 border-fuchsia-400/20 text-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.2)]'
  }

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
      <div className="p-4 relative z-50">
        <nav className="max-w-7xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-8 py-5 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
            <button className="text-white/60 hover:text-white transition-colors bg-transparent border-none">
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="h-6 w-px bg-white/20" />
            <div className="relative flex flex-col items-center">
              <DinoIcon className="w-10 h-8 -ml-1 text-white" style={{ fill: 'currentColor' }} />
              <div className="w-8 h-[2px] mt-0.5 bg-white" />
            </div>
            <span className="font-bold tracking-[0.1em] text-lg uppercase flex items-start gap-1 text-white">
              DOGFOOD<span className="text-[10px] mt-0.5 opacity-60">®</span>
            </span>
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 flex flex-col gap-10 overflow-y-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6 mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.15em] uppercase">
            Frequently Asked
          </h1>
          <p className="text-white/60 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
            Everything you need to know about participating, teaming up, and the project gallery.
          </p>
        </motion.div>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="p-8 md:p-10 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-6">
                  <div className={`flex items-center justify-center p-3.5 rounded-2xl border ${colorMap[faq.color]}`}>
                    <faq.icon size={28} weight="duotone" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-wide text-white">{faq.q}</h3>
                </div>
                <p className="text-white/70 font-light text-base leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </main>
  )
}
