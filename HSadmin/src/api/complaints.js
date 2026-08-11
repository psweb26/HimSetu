import { apiRequest } from "./client";

export function listComplaints(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return apiRequest("/api/admin/complaints" + (query ? "?" + query : ""));
}

export function getComplaint(ticketId) {
  return apiRequest("/api/admin/complaints/" + ticketId);
}

export function verifyComplaint(ticketId, payload) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/verify", { method: "POST", body: JSON.stringify(payload) });
}

export function resolveComplaint(ticketId, payload) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/resolve", { method: "POST", body: JSON.stringify(payload) });
}

export function rejectComplaint(ticketId, payload) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/reject", { method: "POST", body: JSON.stringify(payload) });
}

export function reopenComplaint(ticketId, payload) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/reopen", { method: "POST", body: JSON.stringify(payload) });
}

export function markDuplicate(ticketId, payload) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/duplicate", { method: "POST", body: JSON.stringify(payload) });
}

export function markFake(ticketId, payload) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/fake", { method: "POST", body: JSON.stringify(payload) });
}

export function updateComplaintStatus(ticketId, nextStatus, payload = {}) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/status", {
    method: "PATCH",
    body: JSON.stringify({ ...payload, status: nextStatus }),
  });
}

export function updatePriority(ticketId, priority, remarks) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/priority", { method: "PATCH", body: JSON.stringify({ priority, remarks }) });
}

export function updateDepartment(ticketId, department, remarks) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/department", { method: "PATCH", body: JSON.stringify({ department, remarks }) });
}

export function addAdminNote(ticketId, note) {
  return apiRequest("/api/admin/complaints/" + ticketId + "/admin-note", { method: "POST", body: JSON.stringify({ note }) });
}

export function deleteComplaint(ticketId) {
  return apiRequest("/api/admin/complaints/" + ticketId, { method: "DELETE" });
}

export { apiRequest };
