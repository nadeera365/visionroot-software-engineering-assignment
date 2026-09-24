import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api";
import { useAuth } from "../context/AuthContext";
import "./UserDashboard.css";

export default function UserDashboard() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest(
        "/requests?page=1&limit=50&sort=newest"
      );

      setRequests(result.data.requests);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <main className="user-dashboard">
      <header className="user-header">
        <div>
          <h1>My Service Requests</h1>
          <p>
            Welcome, {account.name} · {account.email}
          </p>
        </div>

        <div className="header-actions">
          <Link className="primary-link" to="/requests/new">
            New Request
          </Link>

          <button className="outline-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {loading && <p className="status-message">Loading requests...</p>}

      {!loading && requests.length === 0 && (
        <section className="empty-state">
          <h2>No requests yet</h2>
          <p>Create your first service request to get started.</p>

          <Link className="primary-link" to="/requests/new">
            Create Request
          </Link>
        </section>
      )}

      {!loading && requests.length > 0 && (
        <section className="request-grid">
          {requests.map((request) => (
            <article className="request-card" key={request._id}>
              <div className="request-card-top">
                <span className={`status-badge ${request.status}`}>
                  {request.status.replace("_", " ")}
                </span>

                <span className={`priority-badge ${request.priority}`}>
                  {request.priority}
                </span>
              </div>

              <h2>{request.title}</h2>

              <p className="request-description">
                {request.description}
              </p>

              <div className="request-meta">
                <span>{request.category}</span>

                <span>
                  {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>

              <Link
                className="details-link"
                to={`/requests/${request._id}`}
              >
                View details
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}