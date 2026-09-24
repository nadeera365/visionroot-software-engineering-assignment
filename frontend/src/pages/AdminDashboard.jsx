import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api";
import { useAuth } from "../context/AuthContext";
import "./AdminDashboard.css";

function AdminDashboard() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams({
          page: String(page),
          limit: "10",
          sort,
        });

        if (search) query.set("search", search);
        if (status) query.set("status", status);
        if (category) query.set("category", category);
        if (priority) query.set("priority", priority);

        const response = await apiRequest(`/requests?${query.toString()}`);

        setRequests(response.data.requests);
        setPagination(response.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, [page, search, status, category, priority, sort]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setCategory("");
    setPriority("");
    setSort("newest");
    setPage(1);
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            Welcome, {account?.name}. Manage all service requests here.
          </p>
        </div>

        <div className="admin-header-actions">
          <Link to="/admin/users" className="manage-users-link">
            Manage Users
          </Link>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="filter-section">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search title or description"
            aria-label="Search service requests"
          />

          <button type="submit">Search</button>
        </form>

        <div className="filter-controls">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            <option value="Technical">Technical</option>
            <option value="Billing">Billing</option>
            <option value="Account">Account</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            aria-label="Sort requests"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>

          <button
            type="button"
            className="clear-filter-button"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>
      </section>

      <div className="request-count">
        {pagination.total} request{pagination.total === 1 ? "" : "s"} found
      </div>

      {loading && <p className="admin-message">Loading requests...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && requests.length === 0 && (
        <div className="admin-empty-card">
          <h2>No requests found</h2>
          <p>Try changing the search text or filters.</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>User</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => (
                <tr key={request._id}>
                  <td>
                    <strong>{request.title}</strong>
                  </td>

                  <td>
                    <span>{request.createdBy?.name ?? "Unknown user"}</span>
                    <small>{request.createdBy?.email}</small>
                  </td>

                  <td>{request.category}</td>

                  <td>
                    <span
                      className={`priority-badge priority-${request.priority.toLowerCase()}`}
                    >
                      {request.priority}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge status-${request.status
                        .toLowerCase()
                        .replace("_", "-")}`}
                    >
                      {request.status.replace("_", " ")}
                    </span>
                  </td>

                  <td>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>

                  <td>
                    <Link
                      to={`/admin/requests/${request._id}`}
                      className="view-request-link"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pagination.totalPages > 0 && (
        <div className="pagination">
          <button
            type="button"
            disabled={!pagination.hasPreviousPage}
            onClick={() => setPage((currentPage) => currentPage - 1)}
          >
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((currentPage) => currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;