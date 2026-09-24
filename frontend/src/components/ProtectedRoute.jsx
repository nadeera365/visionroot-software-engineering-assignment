import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { account, loading } = useAuth();

  if (loading) {
    return <p className="center-message">Checking your session...</p>;
  }

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(account.role)) {
    const home = account.role === "ADMIN" ? "/admin" : "/dashboard";
    return <Navigate to={home} replace />;
  }

  return children;
}