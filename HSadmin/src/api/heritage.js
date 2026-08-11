import { apiRequest } from "./client";

export function listHeritage() {
  return apiRequest("/api/admin/heritage");
}

export function createHeritage(payload) {
  return apiRequest("/api/admin/heritage", { method: "POST", body: JSON.stringify(payload) });
}

export function updateHeritage(id, payload) {
  return apiRequest("/api/admin/heritage/" + id, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteHeritage(id) {
  return apiRequest("/api/admin/heritage/" + id, { method: "DELETE" });
}

export function hideHeritage(id) {
  return apiRequest("/api/admin/heritage/" + id + "/hide", { method: "POST" });
}

export function featureHeritage(id) {
  return apiRequest("/api/admin/heritage/" + id + "/feature", { method: "POST" });
}
