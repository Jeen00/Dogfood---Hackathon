import { AuthLayout } from '../components/Theme'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const navigate = useNavigate()

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md shrink-0 relative"
      >
        <div className="p-8 rounded-[32px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-7 flex flex-col items-center text-center">
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

        <button onClick={async () => {
          try {
            const res = await fetch('/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: localStorage.getItem('signupEmail') }) });
            if (res.ok) alert('Verification email resent');
            else alert('Failed to resend');
          } catch (e) { alert('Error resending email'); }
        }} className="text-xs font-light tracking-wide text-white/50 hover:text-white underline underline-offset-4 mb-8 transition-colors">
          Resend verification email
        </button>

        {/* The email link now goes directly to the backend GET /auth/verify-email which redirects to login. */}
        <div className="w-full p-6 border border-dashed border-white/20 rounded-[24px] bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Check your inbox</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-12 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-2"
          >
            Go to Login <ArrowRight size={14} />
          </button>
        </div>
      </div>
      </motion.div>
    </AuthLayout>
  )
}
