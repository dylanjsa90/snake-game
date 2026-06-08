import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from '@/contexts/auth-context'
import { TopNav } from '@/components/top-nav'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import { SignupPage } from '@/pages/signup'

function App() {
  const { isLoading } = useAuth()
  if (isLoading) return null

  return (
    <div className="font-sans antialiased">
      <TopNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
      <Analytics />
    </div>
  )
}

export default App
