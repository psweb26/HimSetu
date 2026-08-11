export const statusTone = {
  Pending: "border-amber-200 bg-amber-50 text-amber-900",
  "Under Verification": "border-sky-200 bg-sky-50 text-sky-900",
  "In Progress": "border-indigo-200 bg-indigo-50 text-indigo-900",
  "Verified Resolved": "border-emerald-200 bg-emerald-50 text-emerald-900",
  "Reopened via Citizen Veto": "border-rose-200 bg-rose-50 text-rose-900",
  Rejected: "border-slate-200 bg-slate-100 text-slate-700",
};

export const priorityTone = {
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  high: "border-orange-200 bg-orange-50 text-orange-900",
  medium: "border-sky-200 bg-sky-50 text-sky-900",
  low: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function getStatusTone(status) {
  return statusTone[status] || "border-slate-200 bg-slate-50 text-slate-700";
}

export function getPriorityTone(priority) {
  return priorityTone[String(priority || "").toLowerCase()] || priorityTone.medium;
}
