import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/api";
import "./AdminRequestDetails.css";

const allowedTransitions = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: [],
};

export default function AdminRequestDetails() {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadRequest() {
      try {
        setLoading(true);
        setError("");

        const result = await apiRequest(`/requests/${id}`);
        setRequest(result.data.request);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [id]);

  async function handleStatusUpdate(event) {
    event.preventDefault();

    if (!selectedStatus) {
      setError("Please select a new status.");
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const result = await apiRequest(`/requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selectedStatus,
        }),
      });

      // The status update response does not populate the user.
      // Therefore, keep the existing populated user details.
      setRequest((currentRequest) => ({
        ...result.data.request,
        createdBy: currentRequest.createdBy,
      }));

      setSelectedStatus("");
      setSuccess(result.message);
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <p className="admin-details-message">Loading request...</p>;
  }

  if (error && !request) {
    return (
      <main className="admin-request-page">
        <Link className="back-link" to="/admin">
          ← Back to requests
        </Link>

        <div className="error-message">{error}</div>
      </main>
    );
  }

  if (!request) {
    return null;
  }

  const nextStatuses = allowedTransitions[request.status] ?? [];
  const user =
    typeof request.createdBy === "object" ? request.createdBy : null;

  return (
    <main className="admin-request-page">
      <Link className="back-link" to="/admin">
        ← Back to requests
      </Link>

      <section className="admin-request-card">
        <div className="admin-request-title">
          <div>
            <p className="request-reference">Service Request</p>
            <h1>{request.title}</h1>
          </div>

          <span
            className={`admin-status status-${request.status
              .toLowerCase()
              .replace("_", "-")}`}
          >
            {request.status.replace("_", " ")}
          </span>
        </div>

        <div className="admin-request-information">
          <div>
            <span>Category</span>
            <strong>{request.category}</strong>
          </div>

          <div>
            <span>Priority</span>
            <strong>{request.priority}</strong>
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

        <div className="description-section">
          <h2>Description</h2>
          <p>{request.description}</p>
        </div>
      </section>

      <section className="request-user-card">
        <h2>Submitted by</h2>

        {user ? (
          <>
            <p>
              <strong>Name:</strong> {user.name}
            </p>

            <p>
              <strong>Email:</strong> {user.email}
            </p>
          </>
        ) : (
          <p>User details are unavailable.</p>
        )}
      </section>

      <section className="status-update-card">
        <h2>Update request status</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {nextStatuses.length > 0 ? (
          <form className="status-update-form" onSubmit={handleStatusUpdate}>
            <label htmlFor="new-status">
              New status
              <select
                id="new-status"
                value={selectedStatus}
                onChange={(event) => {
                  setSelectedStatus(event.target.value);
                  setError("");
                  setSuccess("");
                }}
              >
                <option value="">Select status</option>

                {nextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={updating}>
              {updating ? "Updating..." : "Update Status"}
            </button>
          </form>
        ) : (
          <p className="terminal-message">
            This request is {request.status.toLowerCase()} and cannot be
            changed again.
          </p>
        )}
      </section>
    </main>
  );
}