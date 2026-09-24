import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api";
import "./RequestForm.css";

const initialForm = {
  title: "",
  description: "",
  category: "Technical",
  priority: "MEDIUM",
};

export default function CreateRequest() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

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
      const result = await apiRequest("/requests", {
        method: "POST",
        body: JSON.stringify(form),
      });

      navigate(`/requests/${result.data.request._id}`, {
        state: {
          message: "Service request created successfully.",
        },
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="request-form-page">
      <form className="request-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <div>
            <h1>Create Service Request</h1>
            <p>Provide clear information about your issue.</p>
          </div>

          <Link to="/dashboard">Back</Link>
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
          {submitting ? "Creating..." : "Create Request"}
        </button>
      </form>
    </main>
  );
}