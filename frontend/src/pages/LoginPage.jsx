import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import DinoIcon from '../components/DinoIcon'

// ─── Reusable Components ──────────────────────────────────────────────────────

function StepItem({ number, text, active }) {
  return (
    <div className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border backdrop-blur-xl transition-all ${
      active
        ? 'bg-white/90 text-black border-white shadow-[0_0_25px_rgba(255,255,255,0.15)]'
        : 'bg-white/[0.05] text-white/70 border-white/10 hover:bg-white/[0.08]'
    }`}>
      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold flex-shrink-0 ${
        active ? 'bg-black text-white' : 'bg-white/15 text-white/60'
      }`}>
        {number}
      </span>
      <span className="text-xs font-medium tracking-wide uppercase">{text}</span>
    </div>
  )
}

// Official Google Logo SVG
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  )
}

// Official GitHub Logo SVG
function GitHubLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
    </svg>
  )
}

function SocialButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-3 h-12 w-full bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-xl border border-white/15 hover:border-white/30 rounded-[20px] transition-all cursor-pointer text-xs font-medium tracking-wider uppercase text-white/80 hover:text-white shadow-sm"
    >
      {children}
      {label}
    </button>
  )
}

function InputGroup({ label, placeholder, type = 'text', value, onChange, children, name }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-white/70 tracking-[0.15em] uppercase">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-[20px] h-12 px-4 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/40 focus:bg-white/[0.14] transition-all text-sm font-light tracking-wide shadow-inner"
        />
        {children}
      </div>
    </div>
  )
}

// ─── Stagger variants ─────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const googleLogin = useGoogleLogin({
    onSuccess: () => navigate('/judge/dashboard'),
    onError: () => alert('Google login failed. Make sure localhost:5173 is in your authorised origins.'),
  })

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail)
    setPassword('demo-session-2026')
  }

  return (
    <main className="relative flex min-h-screen w-full bg-[#0a0d12] text-white font-sans selection:bg-white/30 p-3 lg:h-screen lg:overflow-hidden lg:p-6 transition-all duration-500">

      {/* ── Background Video covering the entire viewport ── */}
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

      {/* ── Left Column (Hero Card) ─────────────────────────────── */}
      <div className="relative z-10 hidden lg:flex w-[50%] flex-col items-center justify-center p-8 lg:p-12 h-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-8"
        >
          {/* Logo with Dinosaur & Royalty Typography */}
          <motion.div variants={itemVariants} className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative flex flex-col items-center">
              <DinoIcon className="w-10 h-8 -ml-1 text-white" style={{ fill: 'currentColor' }} />
              <div className="w-8 h-[2px] mt-0.5 bg-white" />
            </div>
            <div className="h-6 w-px bg-white/20" />
            <span className="font-bold tracking-[0.15em] text-lg uppercase flex items-start gap-1 text-white">
              DOGFOOD<span className="text-[10px] mt-0.5 opacity-60">®</span>
            </span>
          </motion.div>

          {/* Heading */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.1em] uppercase text-white">
              Portal Access
            </h1>
            <p className="text-white/70 text-sm font-light leading-relaxed">
              Access your role-based dashboard to manage submissions, judge projects, or monitor live Z-score normalization.
            </p>
          </motion.div>

          {/* Steps */}
          <motion.div variants={itemVariants} className="space-y-3">
            <StepItem number="1" text="Authenticate your identity" active />
            <StepItem number="2" text="Access role dashboard" />
            <StepItem number="3" text="Manage event & scores" />
          </motion.div>
        </motion.div>
      </div>

      {/* ── Right Column (Form with Translucent Controls) ────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-10 lg:px-14 xl:px-20 overflow-y-auto py-10"><div className="flex-1 min-h-[2rem]"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-md p-8 sm:p-10 rounded-[40px] bg-black/45 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-7 shrink-0"
        >
          {/* Header */}
          <div className="space-y-2">
            <button
              onClick={() => navigate('/')}
              className="group text-white/40 hover:text-white text-xs tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none font-medium"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Home
            </button>
            <h2 className="text-2xl sm:text-3xl font-light tracking-[0.15em] uppercase text-white">Welcome Back</h2>
            <p className="text-white/60 text-xs sm:text-sm font-light tracking-wide">Sign in to access the DOGFOOD hackathon portal.</p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3.5">
            <SocialButton label="Google" onClick={() => googleLogin()}>
              <GoogleLogo />
            </SocialButton>
            <SocialButton label="GitHub" onClick={() => window.location.href = 'http://localhost:8080/auth/github'}>
              <GitHubLogo />
            </SocialButton>
          </div>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-white/15" />
            <span className="px-3 text-[10px] font-medium text-white/50 uppercase tracking-[0.25em]">Or</span>
            <div className="flex-1 border-t border-white/15" />
          </div>

          {/* Form */}
          <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              const data = await res.json();
              if (res.ok) {
                if (data.role === 'judge') navigate('/judge/dashboard');
                else if (data.role === 'organizer') navigate('/organizer/events');
                else navigate('/participant/dashboard');
              } else {
                alert(data.error || 'Login failed');
              }
            }} className="space-y-4">
            <InputGroup
              name="email"
              label="Email Address"
              placeholder="organizer@example.org"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/70 tracking-[0.15em] uppercase">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-[20px] h-12 px-4 pr-12 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/40 focus:bg-white/[0.14] transition-all text-sm font-light tracking-wide shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-white/40 mt-1 font-light tracking-wider">Requires at least 8 symbols.</p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-white text-black font-medium tracking-[0.15em] uppercase text-xs rounded-full hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer shadow-lg mt-3"
            >
              Sign In to Portal
            </button>
          </form>

          {/* Quick-Fill Demo Accounts */}
          <div className="p-4 rounded-[24px] bg-white/[0.05] backdrop-blur-md border border-white/10 text-xs text-white/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white/75 uppercase tracking-[0.2em] text-[10px]">Demo Accounts</p>
              <span className="text-[9px] uppercase tracking-wider text-white/40">Click to autofill</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-light">
              <button
                type="button"
                onClick={() => fillDemo('tomas.varga@example.org')}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 transition-colors text-left cursor-pointer"
              >
                <div className="text-white/50 text-[10px] uppercase font-medium">Judge</div>
                <div className="text-white/90 font-mono truncate">tomas.varga</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('organizer@example.org')}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 transition-colors text-left cursor-pointer"
              >
                <div className="text-white/50 text-[10px] uppercase font-medium">Organizer</div>
                <div className="text-white/90 font-mono truncate">organizer</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('priya1@example.org')}
                className="p-2 rounded-[16px] bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 transition-colors text-left cursor-pointer"
              >
                <div className="text-white/50 text-[10px] uppercase font-medium">Participant</div>
                <div className="text-white/90 font-mono truncate">priya1</div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-white/40 font-light tracking-wide">
            New to DOGFOOD?{' '}
            <Link to="/signup" className="text-white/80 hover:text-white underline underline-offset-4 transition-colors font-normal">
              Create an account
            </Link>
          </p>

        </motion.div>
<div className="flex-1 min-h-[2rem]"></div>
</div>
</main>
  )
}





