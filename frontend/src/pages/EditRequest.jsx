import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/api";
import "./RequestForm.css";

export default function EditRequest() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Technical",
    priority: "MEDIUM",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequest();
  }, [id]);

  async function loadRequest() {
    try {
      const result = await apiRequest(`/requests/${id}`);
      const request = result.data.request;

      if (request.status !== "PENDING") {
        navigate(`/requests/${id}`, {
          replace: true,
        });
        return;
      }

      setForm({
        title: request.title,
        description: request.description,
        category: request.category,
        priority: request.priority,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await apiRequest(`/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      navigate(`/requests/${id}`, {
        state: {
          message: "Service request updated successfully.",
        },
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="center-message">Loading request...</p>;
  }

  return (
    <main className="request-form-page">
      <form className="request-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <div>
            <h1>Edit Request</h1>
            <p>Only pending requests can be edited.</p>
          </div>

          <Link to={`/requests/${id}`}>Back</Link>
        </div>

        {error && <div className="error-message">{error}</div>}

        <label>
          Title
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            minLength="3"
            maxLength="120"
            required
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            minLength="10"
            maxLength="3000"
            rows="7"
            required
          />
        </label>

        <div className="form-row">
          <label>
            Category
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="Technical">Technical</option>
              <option value="Billing">Billing</option>
              <option value="Account">Account</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Priority
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </main>
  );
}