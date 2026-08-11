import { apiRequest } from "./client";

export function getSummary() {
  return apiRequest("/api/admin/dashboard");
}
