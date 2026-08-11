import { Activity, MapPin, ArrowRight, AlertTriangle } from "lucide-react";

/**
 * Production-grade Telemetry Component
 * Purely presentational; all formatting and logic handled by the parent.
 */
const cx = (...classes) => classes.filter(Boolean).join(" ");
export default function LiveTicketTelemetry({ 
  ticket, 
  confidence, 
  confidenceBarStyle, 
  lastUpdated,
  priorityData, 
  metadata, 
  metrics, 
  onOpenWorkspace 
}) {
  return (
    <section className="border border-[var(--dry-wool)] bg-white shadow-xs rounded-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--dry-wool)] p-5 bg-stone-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--devdar-forest)]" />
            <h2 className="text-lg font-black text-[var(--devdar-forest)] uppercase tracking-tight">LIVE TICKET TELEMETRY</h2>
          </div>
          <span className="flex items-center gap-1.5 bg-white border border-[var(--dry-wool)] px-2 py-0.5 rounded-xs text-[9px] font-black uppercase text-emerald-700 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">Live incident monitoring</p>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Incident ID & Priority */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Incident ID</p>
            <p className="font-mono text-xs font-black text-slate-900 mt-0.5 border border-[var(--dry-wool)] px-2 py-0.5 bg-stone-50 rounded-sm">
              {ticket.id}
            </p>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-1">
              Last Updated: {lastUpdated}
            </p>
          </div>
          <div className={cx("px-3 py-1.5 text-center border flex flex-col items-center gap-1", priorityData.colorClass)}>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              <p className="text-[8px] font-black uppercase tracking-widest">PRIORITY</p>
            </div>
            <p className="text-xs font-black uppercase">{priorityData.label}</p>
          </div>
        </div>

        {/* Title & Location */}
        <div className="space-y-1">
          <h4 className="text-xl font-black text-slate-900 leading-snug">{ticket.title}</h4>
          <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-[var(--pahadi-crimson)]" /> {ticket.location}
          </div>
        </div>

        {/* Metadata Pills */}
        <div className="flex flex-wrap gap-2">
          {metadata.map((m) => (
            <div key={m.value} className="text-[10px] font-bold text-[var(--devdar-forest)] border border-[var(--dry-wool)] bg-stone-50 px-2 py-1 rounded-sm inline-flex items-center gap-1.5">
              <m.icon className="h-3 w-3" /> {m.value}
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 border-y border-[var(--dry-wool)] py-4">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-base font-black text-slate-900">
                <m.icon className="h-3.5 w-3.5 text-slate-400" /> {m.val}
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Credibility */}
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
            <span>Incident Credibility</span>
            <span>{confidence}</span>
          </div>
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className={cx("h-full transition-all duration-500", confidenceBarStyle)} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-16 bg-[url('/assets/report-watermark.png')] bg-bottom bg-no-repeat opacity-10 pointer-events-none" />
      <button 
        className="w-full bg-[var(--devdar-forest)] text-white p-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#132B1F] transition flex items-center justify-center gap-1.5"
        onClick={() => onOpenWorkspace(ticket.id)}
        aria-label={`Open incident record ${ticket.id}`}
      >
        Open Incident Record <ArrowRight className="h-3 w-3" />
      </button>
    </section>
  );
}