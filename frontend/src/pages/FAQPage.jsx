import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

export default function FAQPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans p-8 md:p-24">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-12 hover:opacity-70 transition-opacity">
        <ArrowLeft size={20} /> Back to Home
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-light tracking-widest uppercase mb-12">Frequently Asked</h1>
        
        <div className="space-y-8">
          {[
            { q: 'Who can participate?', a: 'DOGFOOD 2026 is open to developers, designers, and innovators worldwide. You can join solo or in teams of up to 4.' },
            { q: 'How are teams formed?', a: 'You can create a team in your portal and share your unique invite code with friends.' },
            { q: 'When do submissions close?', a: 'Submissions strictly close at the deadline. Late submissions are automatically rejected by the platform.' },
            { q: 'Can I see other projects?', a: 'Yes! The public Gallery is continuously updated with all submitted projects and eventually, the final scores.' }
          ].map((item, i) => (
            <div key={i} className="border-b border-black/10 pb-6">
              <h3 className="text-xl font-bold mb-3">{item.q}</h3>
              <p className="opacity-70">{item.a}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
