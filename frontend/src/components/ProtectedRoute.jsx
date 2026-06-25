import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (
    requireAdmin &&
    user.role !== "ADMIN" &&
    user.role !== "SENIOR_ADMIN" &&
    user.role !== "FOUNDER"
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;