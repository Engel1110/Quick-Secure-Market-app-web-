import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem("qsm_token");
  const user = JSON.parse(localStorage.getItem("qsm_user"));

  if (!token || !user) {
    return <Navigate to="/" />;
  }

  if (requireAdmin && user.role !== "ADMIN") {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default ProtectedRoute;