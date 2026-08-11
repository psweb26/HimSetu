import { CheckCircle2, Eye, MoreHorizontal, ShieldCheck } from "lucide-react";

import { formatDateTime } from "../../utils/format";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import StatusBadge from "./StatusBadge";

export default function ComplaintTable({ rows = [], onSelect, onResolve, onVerify, onMore }) {
  if (!rows.length) {
    return <EmptyState title="No complaints in this filter" />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="table-grid hidden gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 xl:grid">
        <span>Ticket</span>
        <span>Location</span>
        <span>Department</span>
        <span>Priority</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((ticket) => (
          <article className="table-grid grid gap-3 px-4 py-4 xl:items-center" key={ticket.ticket_id}>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-him-river">{ticket.ticket_id}</p>
              <button className="mt-1 block truncate text-left text-sm font-black text-slate-950 hover:text-him-pine" onClick={() => onSelect(ticket)} type="button">
                {ticket.title}
              </button>
              <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{ticket.description}</p>
            </div>
            <div className="text-xs font-bold text-slate-700">
              {ticket.district}
              <p className="font-medium text-slate-500">{ticket.block} / {ticket.panchayat}</p>
            </div>
            <div className="text-xs font-bold text-slate-700">{ticket.department}</div>
            <StatusBadge type="priority" value={ticket.priority} />
            <div className="grid gap-1">
              <StatusBadge value={ticket.status} />
              <span className="text-[10px] font-semibold text-slate-500">SLA {formatDateTime(ticket.sla_due_date)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="h-8 px-2" onClick={() => onSelect(ticket)} variant="secondary">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button className="h-8 px-2" onClick={() => onVerify(ticket)} variant="secondary">
                <ShieldCheck className="h-3.5 w-3.5" />
              </Button>
              <Button className="h-8 px-2" onClick={() => onResolve(ticket)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button className="h-8 px-2" onClick={() => onMore(ticket)} variant="secondary">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
