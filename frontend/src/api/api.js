const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(path, options = {}) {
  const requestOptions = {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  };

  if (options.body) {
    requestOptions.headers["Content-Type"] = "application/json";
    requestOptions.headers["X-Requested-With"] = "XMLHttpRequest";
  }

  const response = await fetch(`${API_URL}${path}`, requestOptions);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}