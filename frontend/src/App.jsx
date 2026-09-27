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
import GalleryPage from './pages/GalleryPage'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

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
        <Route path="/projects" element={<GalleryPage />} />
        
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
