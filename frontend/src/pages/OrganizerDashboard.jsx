import { useNavigate } from 'react-router-dom'
import { DownloadSimple, MathOperations, Users, FileText } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function OrganizerDashboard() {
  const navigate = useNavigate()
  
  // Mock data for Recharts
  const data = [
    { name: 'Tomas', scored: 12, total: 20 },
    { name: 'Wei', scored: 18, total: 20 },
    { name: 'Sarah', scored: 5, total: 20 },
    { name: 'James', scored: 20, total: 20 },
    { name: 'Kofi', scored: 20, total: 20 }
  ]

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Organizer Dashboard</h1>
            <p className="text-white/50">Track hackathon progress and export results.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-sm font-medium cursor-pointer"
          >
            Log out
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Projects', value: '40', Icon: FileText },
            { label: 'Active Judges', value: '30', Icon: Users },
            { label: 'Scores Submitted', value: '137', Icon: MathOperations }
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-6">
              <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                <stat.Icon size={28} weight="duotone" className="text-white/70" />
              </div>
              <div>
                <div className="text-sm font-medium text-white/50 mb-1">{stat.label}</div>
                <div className="text-3xl font-bold">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 p-8 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-xl font-semibold mb-8">Judge Completion Rate</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="scored" fill="#ffffff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Section */}
          <div className="space-y-6">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <MathOperations size={24} weight="duotone" className="text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Cross-Judge Normalization</h3>
              <p className="text-white/50 text-sm mb-6">Compute Z-scores to eliminate strict/lenient judge bias.</p>
              <button className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors font-medium text-sm cursor-pointer">
                Run Normalization
              </button>
            </div>

            <div className="p-8 rounded-2xl bg-white text-black">
              <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-6">
                <DownloadSimple size={24} weight="bold" className="text-black" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Export Results</h3>
              <p className="text-black/60 text-sm mb-6">Download the final scoring matrix for offline review.</p>
              <a 
                href="/api/export.csv"
                target="_blank"
                className="w-full py-3 rounded-full bg-black text-white hover:bg-black/90 transition-colors font-medium text-sm flex items-center justify-center cursor-pointer"
              >
                Download CSV
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
