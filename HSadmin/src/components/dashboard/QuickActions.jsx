import { Download, RefreshCcw, Settings, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function QuickActions({ onRefresh }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-him-river">Control Panel</p>
      <h3 className="mt-1 text-sm font-black text-slate-950">Quick Actions</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold text-slate-800 hover:bg-white" onClick={onRefresh} type="button">
          <RefreshCcw className="h-4 w-4 text-him-river" />
          Refresh Command Data
        </button>
        <Link className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 hover:bg-white" to="/jan-pukaar">
          <ShieldCheck className="h-4 w-4 text-him-pine" />
          Verify Complaints
        </Link>
        <Link className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 hover:bg-white" to="/settings">
          <Settings className="h-4 w-4 text-him-marigold" />
          API Settings
        </Link>
        <button className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold text-slate-800 hover:bg-white" type="button">
          <Download className="h-4 w-4 text-him-crimson" />
          Export Queue Snapshot
        </button>
      </div>
    </section>
  );
}
