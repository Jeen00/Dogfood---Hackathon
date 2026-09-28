import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import JudgeDashboard from './pages/JudgeDashboard'
import ScorePage from './pages/ScorePage'
import OrganizerDashboard from './pages/OrganizerDashboard'
import OrganizerEventsPage from './pages/OrganizerEventsPage'
import OrganizerResultsPage from './pages/OrganizerResultsPage'
import OrganizerAssignmentsPage from './pages/OrganizerAssignmentsPage'
import ParticipantDashboard from './pages/ParticipantDashboard'
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
        
        {/* Participant Routes */}
        <Route path="/participant/dashboard" element={<ParticipantDashboard />} />

        {/* Judge Routes */}
        <Route path="/judge/dashboard" element={<JudgeDashboard />} />
        <Route path="/judge/score/:id" element={<ScorePage />} />
        
        {/* Organizer Routes */}
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
        <Route path="/organizer/events" element={<OrganizerEventsPage />} />
        <Route path="/organizer/results" element={<OrganizerResultsPage />} />
        <Route path="/organizer/assignments" element={<OrganizerAssignmentsPage />} />
      </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
