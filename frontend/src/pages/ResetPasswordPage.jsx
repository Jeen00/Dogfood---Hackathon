import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import DinoIcon from '../components/DinoIcon'
import { AuthLayout, Heading, Subheading, Label, Input, PrimaryButton } from '../components/Theme'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
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

  const handleReset = async (e) => {
    e.preventDefault()
    if (passwordStrength !== 'strong') {
      alert('Password is not strong enough.')
      return
    }
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    
    if (!token) {
      alert('Reset token missing from URL.');
      return;
    }

    try {
      const res = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Password reset successfully.');
        navigate('/login');
      } else {
        alert(data.error || 'Reset failed.');
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
                <Subheading>Set Password</Subheading>
                <p className="text-white/60 text-xs sm:text-sm font-light tracking-wide">
                  Choose a new password for your account.
                </p>
              </div>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12"
                      required
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
                <PrimaryButton type="submit" className="mt-3" disabled={passwordStrength !== 'strong'}>
                  Reset Password
                </PrimaryButton>
              </form>
            </div>
      </motion.div>
    </AuthLayout>
  )
}
