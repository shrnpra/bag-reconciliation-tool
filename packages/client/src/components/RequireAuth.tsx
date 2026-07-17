import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../context/AuthContext'

interface RequireAuthProps {
  children: React.ReactNode
  requiredRole?: Role
}

/**
 * Wraps protected routes.
 *
 * - No authenticated user → redirect to /login
 * - Authenticated but wrong role → redirect to /dashboard
 */
export default function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
