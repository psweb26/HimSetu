import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

import { formatDuration, minutesUntil } from "../../utils/format";
import StatusBadge from "../complaints/StatusBadge";

export default function PendingQueue({ grievances = [] }) {
  const rows = grievances
    .filter((item) => item.status !== "Verified Resolved")
    .slice(0, 6);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-him-river">Priority Worklist</p>
          <h3 className="mt-1 text-sm font-black text-slate-950">Pending Queue</h3>
        </div>
        <Link className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-him-pine" to="/jan-pukaar">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map((ticket) => {
          const minutes = minutesUntil(ticket.sla_due_date);
          return (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-3" key={ticket.ticket_id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{ticket.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {ticket.district} / {ticket.block} / {ticket.panchayat}
                  </p>
                </div>
                <StatusBadge type="priority" value={ticket.priority} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                <span>{ticket.ticket_id}</span>
                <span className={minutes < 0 ? "text-him-crimson" : "text-him-river"}>
                  <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                  {formatDuration(minutes)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
