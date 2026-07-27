import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <p className="page-loading">Checking your session…</p>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
