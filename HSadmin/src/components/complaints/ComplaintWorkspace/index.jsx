import { Building2, Clock3, MapPin, UserRound } from "lucide-react";

import { formatDateTime } from "../../../utils/format";
import StatusBadge from "../StatusBadge";
import Timeline from "./Timeline";
import EvidenceGallery from "./EvidenceGallery";

export default function ComplaintWorkspace({ ticket }) {
  if (!ticket) return null;

  const facts = [
    ["Citizen", ticket.citizenName || "Anonymous", UserRound],
    ["Location", `${ticket.district} / ${ticket.block}`, MapPin],
    ["Department", ticket.department, Building2],
    ["SLA Due", formatDateTime(ticket.sla_due_date), Clock3],
  ];

  return (
    <div className="grid gap-4">
      <div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge type="priority" value={ticket.priority} />
          <StatusBadge value={ticket.status} />
        </div>
        <h3 className="mt-3 text-lg font-black leading-6 text-slate-950">{ticket.title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{ticket.description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {facts.map(([label, value, Icon]) => (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={label}>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Icon className="h-3.5 w-3.5 text-him-river" />
              {label}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{value || "Not available"}</p>
          </div>
        ))}
      </div>
      <Timeline ticket={ticket} />
      <EvidenceGallery evidence={ticket.evidence || []} count={ticket.evidenceCount} />
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Community comments</p>
        <div className="mt-3 grid gap-2">
          {(ticket.community_comments || ticket.comments || []).map((comment) => <p className="rounded-md bg-slate-50 p-3 text-sm font-medium text-slate-700" key={comment.id}>{comment.comment || comment.reason}</p>)}
          {!((ticket.community_comments || ticket.comments || []).length) && <p className="text-sm font-medium text-slate-500">No community comments.</p>}
        </div>
      </section>
    </div>
  );
}
