import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const [authStatus, setAuthStatus] = useState(null)

  useEffect(() => {
    fetch('/auth/me')
      .then(res => res.json())
      .then(data => {
        setAuthStatus(data)
      })
      .catch(err => {
        console.error(err)
        setAuthStatus({ loggedIn: false })
      })
  }, [])

  if (authStatus === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0d12]">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!authStatus.loggedIn) {
    return <Navigate to="/login" replace />
  }

  if (!authStatus.profileComplete) {
    return <Navigate to="/complete-profile" replace />
  }

  return <Outlet />
}
