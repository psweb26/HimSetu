import { apiRequest } from "./client";

export function listCommunity() {
  return apiRequest("/api/admin/community");
}

export function getCommunityIncident(incidentId) {
  return apiRequest("/api/admin/community/" + incidentId);
}

export function pinIncident(incidentId) {
  return apiRequest("/api/admin/community/" + incidentId + "/pin", { method: "POST" });
}

export function hideIncident(incidentId) {
  return apiRequest("/api/admin/community/" + incidentId + "/hide", { method: "POST" });
}

export function deleteIncident(incidentId) {
  return apiRequest("/api/admin/community/" + incidentId, { method: "DELETE" });
}
