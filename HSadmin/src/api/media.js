import { apiRequest } from "./client";

export function listMedia(status) {
  const query = status ? `?status_filter=${encodeURIComponent(status)}` : "";
  return apiRequest(`/api/admin/media${query}`);
}

export function reviewMedia(id) { return apiRequest(`/api/admin/media/${id}/review`, { method: "POST" }); }
export function approveMedia(id) { return apiRequest(`/api/admin/media/${id}/approve`, { method: "POST" }); }
export function rejectMedia(id) { return apiRequest(`/api/admin/media/${id}/reject`, { method: "POST" }); }
export function deleteMedia(id) { return apiRequest(`/api/admin/media/${id}`, { method: "DELETE" }); }
