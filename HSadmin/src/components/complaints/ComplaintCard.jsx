import { MapPin, ThumbsUp } from "lucide-react";

import { formatDateTime } from "../../utils/format";
import StatusBadge from "./StatusBadge";

export default function ComplaintCard({ ticket, onClick }) {
  return (
    <button className="rounded-md border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-command" onClick={onClick} type="button">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-him-river">{ticket.ticket_id}</p>
          <h3 className="mt-1 text-sm font-black leading-5 text-slate-950">{ticket.title}</h3>
        </div>
        <StatusBadge type="priority" value={ticket.priority} />
      </div>
      <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{ticket.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
        <span><MapPin className="mr-1 inline h-3.5 w-3.5" />{ticket.district}</span>
        <span><ThumbsUp className="mr-1 inline h-3.5 w-3.5" />{ticket.upvotes}</span>
        <span>{formatDateTime(ticket.created_at)}</span>
      </div>
    </button>
  );
}
