import { Radio } from "lucide-react";

import { formatDateTime } from "../../utils/format";

export default function RecentActivity({ alerts = [] }) {
  const rows = alerts.slice(0, 6);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-him-crimson">Executive Alerts</p>
      <h3 className="mt-1 text-sm font-black text-slate-950">Active Escalations</h3>
      <div className="mt-4 grid gap-3">
        {rows.map((alert, index) => (
          <div className="flex gap-3 rounded-md border border-rose-100 bg-rose-50/70 p-3" key={`${alert.ticket_id || index}`}>
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-him-crimson" />
            <div>
              <p className="text-sm font-bold leading-5 text-slate-900">{alert.message || alert.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {alert.ticket_id || "Alert"} {alert.generated_at ? ` at ${formatDateTime(alert.generated_at)}` : ""}
              </p>
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-sm font-medium text-slate-500">No active escalation alerts.</p>}
      </div>
    </section>
  );
}
