import { CheckCircle2, CircleDot, Clock3, FilePlus2, ShieldCheck, UserRound } from "lucide-react";

import { formatDateTime } from "../../../utils/format";

function entryIcon(label, index, total) {
  if (index === total - 1 && /resolved|closed/i.test(label)) return CheckCircle2;
  if (/verified|approved/i.test(label)) return ShieldCheck;
  if (/created|submitted/i.test(label)) return FilePlus2;
  if (/sla|due/i.test(label)) return Clock3;
  return CircleDot;
}

export default function Timeline({ ticket }) {
  const entries = ticket?.timeline?.length ? ticket.timeline.map((item) => ({
    label: item.to_state || "Status updated",
    detail: `${item.actor || "System"} · ${item.reason || "Status changed"}`,
    at: item.created_at,
  })) : [
    { label: "Citizen submitted", detail: ticket?.citizenName || "Citizen report registered", at: ticket?.created_at },
    { label: "Current case state", detail: ticket?.status || "Awaiting review", at: ticket?.updated_at || ticket?.created_at },
    { label: "SLA checkpoint", detail: "Resolution target", at: ticket?.sla_due_date },
  ];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Case timeline</p>
      <div className="mt-4 grid gap-0">
        {entries.map((entry, index) => {
          const Icon = entryIcon(entry.label, index, entries.length);
          return (
            <div className="relative flex gap-3 pb-5 last:pb-0" key={`${entry.label}-${index}`}>
              {index < entries.length - 1 && <span className="absolute left-[9px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />}
              <span className="z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-sky-200 bg-sky-50 text-him-river"><Icon className="h-3 w-3" /></span>
              <div className="min-w-0 pt-0.5">
                <p className="text-xs font-black text-slate-800">{entry.label}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{entry.detail}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"><UserRound className="h-3 w-3" /> {entry.at ? formatDateTime(entry.at) : "Timestamp pending"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
