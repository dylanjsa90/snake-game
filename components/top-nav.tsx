import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'

export function TopNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <nav className="border-b px-4 h-14 flex items-center justify-between">
      <Link to="/" className="font-semibold tracking-tight">
        Snake Game
      </Link>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}
