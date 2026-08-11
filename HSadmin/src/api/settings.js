import { apiRequest } from "./client";

export function getSettings() {
  return apiRequest("/api/admin/settings");
}

export function getAdminHealth() {
  return apiRequest("/api/admin/health");
}
