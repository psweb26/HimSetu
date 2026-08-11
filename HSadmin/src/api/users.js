import { apiRequest } from "./client";

export function listUsers(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return apiRequest("/api/admin/users" + (query ? "?" + query : ""));
}

export function suspendUser(userId, userType = "citizen") {
  return apiRequest("/api/admin/users/" + userId + "/suspend?user_type=" + encodeURIComponent(userType), { method: "POST" });
}

export function activateUser(userId, userType = "citizen") {
  return apiRequest("/api/admin/users/" + userId + "/activate?user_type=" + encodeURIComponent(userType), { method: "POST" });
}

export function deleteUser(userId, userType = "citizen") {
  return apiRequest("/api/admin/users/" + userId + "?user_type=" + encodeURIComponent(userType), { method: "DELETE" });
}
