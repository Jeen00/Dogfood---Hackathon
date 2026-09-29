import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AuthLayout, Heading, Subheading, Label, Input, PrimaryButton, Select } from '../components/Theme'
import DinoIcon from '../components/DinoIcon'

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [college, setCollege] = useState('')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [expertise, setExpertise] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/auth/me').then(r => r.json()).then(data => {
      if (data.loggedIn && data.name) {
        setName(data.name)
      }
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!role) {
      alert("Please select a role")
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, name, college, phone, organization, expertise })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.role === 'judge') navigate('/judge/dashboard', { replace: true })
        else if (data.role === 'organizer') navigate('/organizer/events', { replace: true })
        else navigate('/participant/dashboard', { replace: true })
      } else {
        alert(data.error || 'Failed to complete profile')
      }
    } catch (err) {
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="p-8 rounded-[32px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-7">
          <div className="space-y-2 text-center flex flex-col items-center">
            <div className="relative flex flex-col items-center mb-4">
              <DinoIcon className="w-10 h-8 text-white" style={{ fill: 'currentColor' }} />
              <div className="w-8 h-[2px] mt-0.5 bg-white" />
            </div>
            <Heading>Complete Profile</Heading>
            <p className="text-white/60 text-sm font-light tracking-wide">Tell us a bit more about yourself.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label>Who are you?</Label>
              <Select value={role} onChange={e => setRole(e.target.value)} required>
                <option value="">Select a role...</option>
                <option value="participant">Participant</option>
                <option value="judge">Judge</option>
              </Select>
            </div>

            {role && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                <div className="space-y-1.5 pt-2">
                  <Label>Full Name</Label>
                  <Input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              </motion.div>
            )}

            {role === 'participant' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                <div className="space-y-1.5 pt-2">
                  <Label>College / Organization</Label>
                  <Input type="text" value={college} onChange={e => setCollege(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone (Optional)</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </motion.div>
            )}

            {role === 'judge' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                <div className="space-y-1.5 pt-2">
                  <Label>Organization</Label>
                  <Input type="text" value={organization} onChange={e => setOrganization(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Area of Expertise</Label>
                  <Input type="text" value={expertise} onChange={e => setExpertise(e.target.value)} required />
                </div>
              </motion.div>
            )}

            <PrimaryButton type="submit" disabled={loading} className="w-full mt-4">
              {loading ? 'Saving...' : 'Complete Profile'}
            </PrimaryButton>
          </form>
        </div>
      </motion.div>
    </AuthLayout>
  )
}
