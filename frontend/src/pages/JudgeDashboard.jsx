import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CheckCircle, Clock } from '@phosphor-icons/react'

export default function JudgeDashboard() {
  const navigate = useNavigate()
  // Mock data to visualize the dark UI immediately
  const [assignments, setAssignments] = useState([
    { id: 'prj_01', title: 'Glass Signal', track: 'Developer tools', scored: true },
    { id: 'prj_02', title: 'Small Meadow', track: 'Accessibility', scored: false },
    { id: 'prj_03', title: 'Deep Compass', track: 'Security', scored: false }
  ])

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Judge Dashboard</h1>
            <p className="text-white/50">Review and score your assigned projects.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-sm font-medium cursor-pointer"
          >
            Log out
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {assignments.map((prj) => (
            <div 
              key={prj.id} 
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <FileText size={24} weight="duotone" className="text-white/70" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{prj.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/70">
                      {prj.track}
                    </span>
                    <span className="text-xs text-white/40 font-medium">ID: {prj.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {prj.scored ? (
                  <div className="flex items-center gap-1.5 text-emerald-400/90 text-sm font-medium">
                    <CheckCircle size={18} weight="fill" />
                    <span>Scored</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-400/90 text-sm font-medium">
                    <Clock size={18} weight="fill" />
                    <span>Pending</span>
                  </div>
                )}
                <button 
                  onClick={() => navigate(`/judge/score/${prj.id}`)}
                  className="px-5 py-2 rounded-full bg-white text-black font-semibold text-sm hover:scale-105 transition-transform cursor-pointer"
                >
                  {prj.scored ? 'Edit Score' : 'Score Project'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
