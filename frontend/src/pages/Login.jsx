import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    accountType: "USER",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      const account = await login(form);

      if (account.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Welcome back</h1>
        <p>Log in to manage service requests.</p>

        {location.state?.message && (
          <div className="success-message">{location.state.message}</div>
        )}

        {error && <div className="error-message">{error}</div>}

        <label>
          Login as
          <select
            name="accountType"
            value={form.accountType}
            onChange={handleChange}
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength="8"
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Login"}
        </button>

        <p className="auth-link">
          New user? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </main>
  );
}