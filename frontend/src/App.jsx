import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import CompleteProfilePage from './pages/CompleteProfilePage'
import JudgeDashboard from './pages/JudgeDashboard'
import JudgeInvitesPage from './pages/JudgeInvitesPage'
import ScorePage from './pages/ScorePage'
import OrganizerDashboard from './pages/OrganizerDashboard'
import OrganizerInvitesPage from './pages/OrganizerInvitesPage'
import OrganizerEventsPage from './pages/OrganizerEventsPage'
import OrganizerResultsPage from './pages/OrganizerResultsPage'
import OrganizerAssignmentsPage from './pages/OrganizerAssignmentsPage'
import ParticipantDashboard from './pages/ParticipantDashboard'
import TeamJoinPage from './pages/TeamJoinPage'
import NotificationsPage from './pages/NotificationsPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import TracksPage from './pages/TracksPage'
import RulesPage from './pages/RulesPage'
import FAQPage from './pages/FAQPage'
import AboutPage from './pages/AboutPage'
import MotivePage from './pages/MotivePage'
import ReviewsPage from './pages/ReviewsPage'
import ContactPage from './pages/ContactPage'
import GalleryPage from './pages/GalleryPage'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id'

function ProtectedRoute({ children, allowedRoles }) {
  const [authState, setAuthState] = useState({ data: null, path: null })
  const location = useLocation()

  useEffect(() => {
    let active = true;
    fetch('/auth/me').then(r => r.json()).then(data => {
      if (active) setAuthState({ data, path: location.pathname })
    }).catch(() => {
      if (active) setAuthState({ data: { loggedIn: false }, path: location.pathname })
    })
    return () => { active = false; }
  }, [location.pathname])

  if (authState.path !== location.pathname || !authState.data) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-sm tracking-widest uppercase">Loading...</div>
  }

  const auth = authState.data;

  if (!auth.loggedIn) return <Navigate to="/login" replace />
  
  if (!auth.profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  if (auth.profileComplete && location.pathname === '/complete-profile') {
    if (auth.role === 'judge') return <Navigate to="/judge/dashboard" replace />
    if (auth.role === 'organizer') return <Navigate to="/organizer/events" replace />
    return <Navigate to="/participant/dashboard" replace />
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    if (auth.role === 'judge') return <Navigate to="/judge/dashboard" replace />
    if (auth.role === 'organizer') return <Navigate to="/organizer/events" replace />
    return <Navigate to="/participant/dashboard" replace />
  }

  return children
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/motive" element={<MotivePage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
        <Route path="/projects" element={<GalleryPage />} />
        <Route path="/tracks" element={<TracksPage />} />
        
        {/* Participant Routes */}
        <Route path="/team/join" element={<ProtectedRoute allowedRoles={['participant']}><TeamJoinPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/participant/dashboard" element={<ProtectedRoute allowedRoles={['participant']}><ParticipantDashboard /></ProtectedRoute>} />

        {/* Judge Routes */}
        <Route path="/judge/invites" element={<ProtectedRoute allowedRoles={['judge', 'organizer']}><JudgeInvitesPage /></ProtectedRoute>} />
        <Route path="/judge/dashboard" element={<ProtectedRoute allowedRoles={['judge']}><JudgeDashboard /></ProtectedRoute>} />
        <Route path="/judge/score/:id" element={<ProtectedRoute allowedRoles={['judge']}><ScorePage /></ProtectedRoute>} />
        
        {/* Organizer Routes */}
        <Route path="/organizer/invites" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerInvitesPage /></ProtectedRoute>} />
        <Route path="/organizer/dashboard" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/organizer/events" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerEventsPage /></ProtectedRoute>} />
        <Route path="/organizer/results" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerResultsPage /></ProtectedRoute>} />
        <Route path="/organizer/assignments" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerAssignmentsPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

