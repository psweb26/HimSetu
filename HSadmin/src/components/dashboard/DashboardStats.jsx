import { Activity, CheckCircle2, CloudRain, Landmark, Siren, Ticket } from "lucide-react";

import { formatNumber } from "../../utils/format";

const statConfig = [
  { key: "total_grievances", label: "Total Tickets", icon: Ticket, tone: "text-him-pine", surface: "bg-white", detail: "Across all districts" },
  { key: "active_pending", label: "Active Queue", icon: Activity, tone: "text-him-river", surface: "bg-sky-50", detail: "Awaiting an action" },
  { key: "critical_queue", label: "Critical", icon: Siren, tone: "text-him-crimson", surface: "bg-rose-50", detail: "Requires priority review" },
  { key: "verified_resolved", label: "Resolved", icon: CheckCircle2, tone: "text-emerald-700", surface: "bg-emerald-50", detail: "Verified case closure" },
  { key: "weather_nodes", label: "Weather Nodes", icon: CloudRain, tone: "text-blue-700", surface: "bg-blue-50", detail: "Telemetry reporting" },
  { key: "heritage_assets", label: "Heritage Assets", icon: Landmark, tone: "text-him-marigold", surface: "bg-amber-50", detail: "Registry records" },
];

export default function DashboardStats({ metrics = {} }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {statConfig.map(({ key, label, icon: Icon, tone, surface, detail }) => (
        <article className={`command-card rounded-md border border-slate-200 ${surface} p-4 shadow-sm`} key={key}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
            <Icon className={`h-4 w-4 ${tone}`} />
          </div>
          <p className={`mt-4 text-2xl font-black tabular-nums ${tone}`}>{formatNumber(metrics[key])}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </article>
      ))}
    </section>
  );
}
