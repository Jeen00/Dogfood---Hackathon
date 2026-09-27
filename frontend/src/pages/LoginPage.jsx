import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LockKey, User } from '@phosphor-icons/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    // Mock login routing based on role (backend handles real session cookies)
    if (email.includes('organizer')) {
      navigate('/organizer/dashboard')
    } else {
      navigate('/judge/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/')}
          className="text-white/40 hover:text-white text-sm mb-12 flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none"
        >
          ← Back to home
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome back</h1>
          <p className="text-white/50">Enter your credentials to access the portal.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className="text-white/40" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <LockKey size={18} className="text-white/40" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black font-semibold rounded-full py-3 mt-4 flex items-center justify-center gap-2 hover:bg-white/90 transition-colors cursor-pointer"
          >
            Sign In
            <ArrowRight size={18} weight="bold" />
          </button>
        </form>

        {/* Demo hints */}
        <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/50">
          <p className="font-medium text-white/70 mb-2">Hackathon Demo Accounts:</p>
          <ul className="space-y-1">
            <li>Judge: <span className="text-white">jdg_01@example.org</span></li>
            <li>Organizer: <span className="text-white">organizer@example.org</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
