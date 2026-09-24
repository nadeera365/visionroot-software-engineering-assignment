import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CreateRequest from "./pages/CreateRequest";
import EditRequest from "./pages/EditRequest";
import RequestDetails from "./pages/RequestDetails";
import AdminRequestDetails from "./pages/AdminRequestDetails";

function HomeRedirect() {
  const { account, loading } = useAuth();

  if (loading) {
    return <p className="center-message">Loading...</p>;
  }

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={account.role === "ADMIN" ? "/admin" : "/dashboard"}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={["USER"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/new"
        element={
          <ProtectedRoute roles={["USER"]}>
            <CreateRequest />
          </ProtectedRoute>
        }
      />

    <Route
      path="/requests/:id"
      element={
        <ProtectedRoute roles={["USER"]}>
          <RequestDetails />
        </ProtectedRoute>
      }
    />

    <Route
      path="/requests/:id/edit"
      element={
        <ProtectedRoute roles={["USER"]}>
          <EditRequest />
        </ProtectedRoute>
      }
    />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests/:id"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminRequestDetails />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}