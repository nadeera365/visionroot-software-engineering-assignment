import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/api";
import "./ManageUsers.css";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams({
          page: String(page),
          limit: "10",
          sort,
        });

        if (search) {
          query.set("search", search);
        }

        if (activeFilter) {
          query.set("isActive", activeFilter);
        }

        const result = await apiRequest(`/users?${query.toString()}`);

        setUsers(result.data.users);
        setPagination(result.pagination);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [page, search, activeFilter, sort]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setSuccess("");
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setActiveFilter("");
    setSort("newest");
    setPage(1);
    setSuccess("");
  }

  async function handleStatusChange(user) {
    const newStatus = !user.isActive;

    const actionConfirmed = window.confirm(
      `Are you sure you want to ${
        newStatus ? "activate" : "deactivate"
      } ${user.name}?`
    );

    if (!actionConfirmed) {
      return;
    }

    try {
      setUpdatingUserId(user.id || user._id);
      setError("");
      setSuccess("");

      const userId = user.id || user._id;

      const result = await apiRequest(`/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: newStatus,
        }),
      });

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => {
          const currentId = currentUser.id || currentUser._id;

          if (currentId === userId) {
            return result.data.user;
          }

          return currentUser;
        })
      );

      setSuccess(result.message);
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdatingUserId("");
    }
  }

  return (
    <main className="manage-users-page">
      <div className="manage-users-heading">
        <div>
          <Link className="users-back-link" to="/admin">
            ← Back to dashboard
          </Link>

          <h1>User Management</h1>
          <p>View and manage registered user accounts.</p>
        </div>
      </div>

      <section className="user-filter-card">
        <form className="user-search-form" onSubmit={handleSearch}>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search users"
          />

          <button type="submit">Search</button>
        </form>

        <div className="user-filter-controls">
          <select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              setPage(1);
              setSuccess("");
            }}
            aria-label="Filter users by account status"
          >
            <option value="">All users</option>
            <option value="true">Active users</option>
            <option value="false">Inactive users</option>
          </select>

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
              setSuccess("");
            }}
            aria-label="Sort users"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>

          <button
            type="button"
            className="clear-users-filter"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <p className="users-total">
        {pagination.total} user{pagination.total === 1 ? "" : "s"} found
      </p>

      {loading && <p className="users-message">Loading users...</p>}

      {!loading && !error && users.length === 0 && (
        <section className="users-empty-state">
          <h2>No users found</h2>
          <p>Try changing the search text or account-status filter.</p>
        </section>
      )}

      {!loading && users.length > 0 && (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Registered</th>
                <th>Account status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => {
                const userId = user.id || user._id;
                const isUpdating = updatingUserId === userId;

                return (
                  <tr key={userId}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td>
                      <span
                        className={
                          user.isActive
                            ? "account-status active-account"
                            : "account-status inactive-account"
                        }
                      >
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={
                          user.isActive
                            ? "deactivate-button"
                            : "activate-button"
                        }
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(user)}
                      >
                        {isUpdating
                          ? "Updating..."
                          : user.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pagination.totalPages > 0 && (
        <div className="users-pagination">
          <button
            type="button"
            disabled={!pagination.hasPreviousPage}
            onClick={() =>
              setPage((currentPage) => currentPage - 1)
            }
          >
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!pagination.hasNextPage}
            onClick={() =>
              setPage((currentPage) => currentPage + 1)
            }
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}