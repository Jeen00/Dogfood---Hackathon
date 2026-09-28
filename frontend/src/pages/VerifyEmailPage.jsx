import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0d12] flex flex-col items-center justify-center text-white p-6 font-sans selection:bg-white/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-8 relative">
          <Mail size={32} className="text-white/80" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="absolute -bottom-2 -right-2 bg-[#0a0d12] rounded-full"
          >
            <CheckCircle2 size={24} className="text-emerald-400" />
          </motion.div>
        </div>
        
        <h1 className="text-3xl font-light tracking-[0.1em] uppercase mb-4">Check Your Email</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-12">
          We've sent a verification link to your email address. Please click the link to confirm your account and proceed to the participant portal.
        </p>

        {/* Development Simulation Button - To be replaced by actual email link later */}
        <div className="w-full p-6 border border-dashed border-white/20 rounded-[24px] bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Development Mode</p>
          <button
            onClick={() => navigate('/participant/dashboard')}
            className="w-full h-12 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-2"
          >
            Simulate Verification <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
