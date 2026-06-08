import { createContext, useContext, useState, useEffect } from 'react'

type User = { id: number; email: string }

type AuthContextType = {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      setIsLoading(false)
      return
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.json())
      .then(({ user }) => {
        if (user) {
          setToken(stored)
          setUser(user)
        } else {
          localStorage.removeItem('token')
        }
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setIsLoading(false))
  }, [])

  function login(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(newUser)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
