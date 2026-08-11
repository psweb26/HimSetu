import { apiRequest } from "./client";

export function listOperation(resource) {
  return apiRequest("/api/admin/operations/" + resource);
}

export function listWeather() {
  return listOperation("weather-nodes");
}

export function listTransit() {
  return listOperation("bus-routes");
}

export function createOperation(resource, payload) {
  return apiRequest("/api/admin/operations/" + resource, { method: "POST", body: JSON.stringify(payload) });
}

export function updateOperation(resource, id, payload) {
  return apiRequest("/api/admin/operations/" + resource + "/" + id, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteOperation(resource, id) {
  return apiRequest("/api/admin/operations/" + resource + "/" + id, { method: "DELETE" });
}
