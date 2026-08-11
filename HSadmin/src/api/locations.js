import { apiRequest } from "./client";

export function listLocations() {
  return apiRequest("/api/admin/locations");
}

export function createDistrict(name) {
  return apiRequest("/api/admin/locations/districts", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateDistrict(name, payload) {
  return apiRequest("/api/admin/locations/districts/" + encodeURIComponent(name), { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteDistrict(name) {
  return apiRequest("/api/admin/locations/districts/" + encodeURIComponent(name), { method: "DELETE" });
}

export function createBlock(district, name) {
  return apiRequest("/api/admin/locations/" + encodeURIComponent(district) + "/blocks", { method: "POST", body: JSON.stringify({ name }) });
}
