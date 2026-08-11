export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL is required. Define it in the admin application's .env file.");
}

const apiBaseUrl = API_URL.replace(/\/+$/, "");

export function getApiUrl(path) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("himsetu-auth-expired"));
    }
    const message = payload?.detail || payload?.message || response.statusText;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function apiRequest(path, options = {}) {
  const token = window.localStorage.getItem("himsetu-admin-token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
  });
  return parseResponse(response);
}

export function login(payload) {
  return apiRequest("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe() {
  return apiRequest("/api/v1/auth/me");
}
