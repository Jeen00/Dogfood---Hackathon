import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import DinoIcon from '../components/DinoIcon'
import { PageContainer, Heading, Subheading, Label, Input, Select, PrimaryButton, SecondaryButton } from '../components/Theme'

// ─── Reusable Components ──────────────────────────────────────────────────────

function StepItem({ number, text, active }) {
  return (
    <div className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border backdrop-blur-xl transition-all ${
      active
        ? 'bg-white/10 text-white border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.05)]'
        : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
    }`}>
      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold flex-shrink-0 ${
        active ? 'bg-white text-black' : 'bg-white/10 text-white/40'
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
export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('participant')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const passwordStrength = useMemo(() => {
    if (!password) return 'empty';
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return 'weak';
    if (score < 5) return 'medium';
    return 'strong';
  }, [password])

  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email])

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!isEmailValid) {
      alert('Please enter a valid email address.')
      return
    }
    if (passwordStrength !== 'strong') {
      alert('Password is not strong enough.')
      return
    }
    try {
      const res = await fetch('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, role })
      })
      if (res.ok) {
        localStorage.setItem('signupEmail', email);
        if (role === 'judge') navigate('/judge/dashboard')
        else navigate('/verify-email')
      } else {
        const data = await res.json()
        alert('Signup failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error(err)
      alert('Error during signup')
    }
  }

  return (
    <PageContainer className="p-3 lg:h-screen lg:overflow-hidden lg:p-6">
      <div className="flex flex-col lg:flex-row w-full h-full flex-1">
        
        {/* ── Left Column (Hero Card) ─────────────────────────────── */}
        <div className="relative z-10 w-[50%] hidden lg:flex flex-col items-center justify-center p-8 lg:p-12 h-full">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-md"
          >
            <div className="p-10 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-8 shadow-2xl">
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
                <Heading>Join DOGFOOD</Heading>
                <p className="text-white/70 text-sm font-light leading-relaxed">
                  Follow these 3 quick phases to activate your team and begin submitting projects to the hackathon.
                </p>
              </motion.div>

              {/* Steps */}
              <motion.div variants={itemVariants} className="space-y-3">
                <StepItem number="1" text="Register your identity" active />
                <StepItem number="2" text="Join or create a team" />
                <StepItem number="3" text="Submit your project" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* ── Right Column (Form with Translucent Controls) ────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-10 lg:px-14 xl:px-20 overflow-y-auto py-10">
          <div className="flex-1 min-h-[2rem]"></div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-md shrink-0 relative"
          >
            <div className="p-8 rounded-[32px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-7">
              {/* Header */}
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/')}
                  className="text-white/40 hover:text-white text-xs tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none font-medium"
                >
                  <span className="transition-transform -translate-x-1">←</span> Back to Home
                </button>
                <Subheading>Create Profile</Subheading>
                <p className="text-white/60 text-xs sm:text-sm font-light tracking-wide">Input your basic details to begin the journey.</p>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-2 gap-3.5">
                <SecondaryButton type="button" onClick={() => navigate('/login')}>
                  <GoogleLogo />
                  Google
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => window.location.href = 'http://localhost:8080/auth/github'}>
                  <GitHubLogo />
                  GitHub
                </SecondaryButton>
              </div>

              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-white/15" />
                <span className="px-3 text-[10px] font-medium text-white/50 uppercase tracking-[0.25em]">Or</span>
                <div className="flex-1 border-t border-white/15" />
              </div>

              {/* Form */}
              <form onSubmit={handleSignup} className="space-y-4">

                {/* Role Selector */}
                <div className="flex flex-col gap-1.5">
                  <Label>Account Type</Label>
                  <Select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="participant">Participant</option>
                    <option value="judge">Judge</option>
                  </Select>
                </div>

                {/* First & Last Name */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <Label>First Name</Label>
                    <Input
                      type="text"
                      placeholder="Priya"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Last Name</Label>
                    <Input
                      type="text"
                      placeholder="Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="you@example.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={email && !isEmailValid ? 'border-red-500/50' : ''}
                  />
                  {email && !isEmailValid && <p className="text-[10px] text-red-400 mt-1 font-light tracking-wider">Invalid email format.</p>}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : passwordStrength === 'strong' ? 'bg-green-500' : 'bg-white/10'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength === 'medium' ? 'bg-yellow-500' : passwordStrength === 'strong' ? 'bg-green-500' : 'bg-white/10'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-white/10'}`}></div>
                    </div>
                  )}
                  <p className="text-[10px] text-white/40 mt-1 font-light tracking-wider">Requires 8 chars, 1 upper, 1 lower, 1 number, 1 special.</p>
                </div>

                <PrimaryButton type="submit" className="mt-3" disabled={passwordStrength !== 'strong' || !isEmailValid}>
                  Create Account
                </PrimaryButton>
              </form>

              {/* Footer */}
              <p className="text-center text-xs text-white/40 font-light tracking-wide">
                Member of the team?{' '}
                <Link to="/login" className="text-white/80 hover:text-white underline underline-offset-4 transition-colors font-normal">
                  Log in
                </Link>
              </p>

            </div>
          </motion.div>
          <div className="flex-1 min-h-[2rem]"></div>
        </div>
      </div>
    </PageContainer>
  )
}
