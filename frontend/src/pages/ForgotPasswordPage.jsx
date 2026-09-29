import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import DinoIcon from '../components/DinoIcon'
import { AuthLayout, Heading, Subheading, Label, Input, PrimaryButton } from '../components/Theme'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
  const navigate = useNavigate()

  const handleReset = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setIsSent(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send reset link.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    }
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full relative"
      >
        <div className="p-8 rounded-[32px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-7">
          <div className="space-y-2 text-center flex flex-col items-center">
            <div className="relative flex flex-col items-center mb-4 cursor-pointer" onClick={() => navigate('/')}>
              <DinoIcon className="w-10 h-8 text-white" style={{ fill: 'currentColor' }} />
              <div className="w-8 h-[2px] mt-0.5 bg-white" />
            </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="group text-white/40 hover:text-white text-xs tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2 transition-colors bg-transparent border-none font-medium cursor-pointer"
                >
                  <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> Back to Login
                </button>
                <Subheading>Forgot Password</Subheading>
                <p className="text-white/60 text-xs sm:text-sm font-light tracking-wide">
                  {isSent ? 'Check your email for the reset link.' : 'We will send you a link to reset your password.'}
                </p>
              </div>
            </div>

            {!isSent ? (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="you@example.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <PrimaryButton type="submit" className="mt-3">
                    Send Reset Link
                  </PrimaryButton>
                </form>
              ) : (
                <div className="p-6 border border-emerald-500/30 bg-emerald-500/10 rounded-2xl text-center">
                  <p className="text-emerald-400 text-sm font-medium">Reset link sent to {email}</p>
                  <button onClick={() => navigate('/reset-password')} className="mt-4 text-xs font-light text-white/50 hover:text-white underline underline-offset-4 cursor-pointer bg-transparent border-none">
                    [Dev: Go to Reset Password]
                  </button>
                </div>
              )}
            </div>
      </motion.div>
    </AuthLayout>
  )
}
