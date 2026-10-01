import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loading from './Loading'

const ProtectedRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return <Loading />
  if (!user) return <Navigate to="/admin/login" replace />
  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return children
}

export default ProtectedRoute
