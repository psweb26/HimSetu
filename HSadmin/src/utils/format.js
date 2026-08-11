export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function minutesUntil(value) {
  if (!value) return null;
  const due = new Date(value).getTime();
  if (Number.isNaN(due)) return null;
  return Math.round((due - Date.now()) / 60000);
}

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return "Not set";
  const sign = minutes < 0 ? "-" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  if (hours === 0) return `${sign}${mins}m`;
  return `${sign}${hours}h ${mins}m`;
}
