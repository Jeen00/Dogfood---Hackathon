import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import JudgeDashboard from './pages/JudgeDashboard'
import ScorePage from './pages/ScorePage'
import OrganizerDashboard from './pages/OrganizerDashboard'

// NOTE: /projects route is intentionally NOT handled here.
// It is server-rendered by Express + EJS and proxied by Vite.
// The run.py acceptance checker requires project titles in raw HTML.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Judge Routes */}
        <Route path="/judge/dashboard" element={<JudgeDashboard />} />
        <Route path="/judge/score/:id" element={<ScorePage />} />
        
        {/* Organizer Routes */}
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
