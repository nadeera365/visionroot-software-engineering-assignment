import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { apiRequest } from "../api/api";
import "./RequestDetails.css";

export default function RequestDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequest();
  }, [id]);

  async function loadRequest() {
    try {
      const result = await apiRequest(`/requests/${id}`);
      setRequest(result.data.request);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this request?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setCancelling(true);

    try {
      const result = await apiRequest(`/requests/${id}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      setRequest(result.data.request);
    } catch (error) {
      setError(error.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <p className="center-message">Loading request...</p>;
  }

  if (error && !request) {
    return (
      <main className="request-details-page">
        <div className="error-message">{error}</div>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  const canEdit = request.status === "PENDING";

  const canCancel =
    request.status === "PENDING" ||
    request.status === "IN_PROGRESS";

  return (
    <main className="request-details-page">
      <div className="details-navigation">
        <Link to="/dashboard">← Back to requests</Link>
      </div>

      {location.state?.message && (
        <div className="success-message">
          {location.state.message}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <article className="details-card">
        <div className="details-heading">
          <div>
            <span className={`status-badge ${request.status}`}>
              {request.status.replace("_", " ")}
            </span>

            <h1>{request.title}</h1>
          </div>

          <span className={`priority-badge ${request.priority}`}>
            {request.priority}
          </span>
        </div>

        <div className="details-information">
          <div>
            <span>Category</span>
            <strong>{request.category}</strong>
          </div>

          <div>
            <span>Created</span>
            <strong>
              {new Date(request.createdAt).toLocaleString()}
            </strong>
          </div>

          <div>
            <span>Last updated</span>
            <strong>
              {new Date(request.updatedAt).toLocaleString()}
            </strong>
          </div>
        </div>

        <section className="description-section">
          <h2>Description</h2>
          <p>{request.description}</p>
        </section>

        <div className="details-actions">
          {canEdit && (
            <Link
              className="edit-link"
              to={`/requests/${request._id}/edit`}
            >
              Edit Request
            </Link>
          )}

          {canCancel && (
            <button
              className="cancel-button"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel Request"}
            </button>
          )}
        </div>
      </article>
    </main>
  );
}