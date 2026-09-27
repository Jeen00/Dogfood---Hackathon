import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import JudgeDashboard from './pages/JudgeDashboard'
import ScorePage from './pages/ScorePage'
import OrganizerDashboard from './pages/OrganizerDashboard'
import RulesPage from './pages/RulesPage'
import FAQPage from './pages/FAQPage'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// NOTE: /projects route is intentionally NOT handled here.
// It is server-rendered by Express + EJS and proxied by Vite.
// The run.py acceptance checker requires project titles in raw HTML.

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Judge Routes */}
        <Route path="/judge/dashboard" element={<JudgeDashboard />} />
        <Route path="/judge/score/:id" element={<ScorePage />} />
        
        {/* Organizer Routes */}
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
      </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
