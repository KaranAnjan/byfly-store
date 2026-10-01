import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loading from './Loading'

const WholesaleRoute = ({ children }) => {
  const { user, loading, profileSummary } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (!profileSummary?.is_wholesaler || profileSummary?.wholesale_enabled === false || profileSummary?.is_active === false) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">B</div>
          <h1 className="text-2xl font-bold text-slate-900">Wholesale access unavailable</h1>
          <p className="mt-2 text-slate-600">This account does not have active wholesale access. Sign in with a customer account or contact the store admin.</p>
        </div>
      </div>
    )
  }
  return children
}

export default WholesaleRoute
