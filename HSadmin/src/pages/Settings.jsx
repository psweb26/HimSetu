import { useState } from "react";
import { CloudRain, Database, HardDrive, Server, ShieldCheck, Workflow } from "lucide-react";

import { getAdminHealth, getSettings } from "../api/settings";
import { API_URL } from "../api/client";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { useFetch } from "../hooks/useFetch";

export default function Settings() {
  const { data, loading, refresh } = useFetch(getSettings);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");
  const [lastSync, setLastSync] = useState(null);

  if (loading && !data) return <Loader label="Loading platform status" />;

  async function checkHealth() {
    setHealthError("");
    try {
      setHealth(await getAdminHealth());
      setLastSync(new Date());
    } catch (err) {
      setHealthError(err.message || "Health check failed.");
    }
  }

  const settings = [["Admin API base", API_URL], ["Shared service", data?.service], ["Region", data?.region], ["API version", data?.api_version], ["Build number", import.meta.env.VITE_APP_BUILD || "Not supplied"]];
  const healthCards = [
    [Server, "Backend API", health?.status === "ok" ? "Operational" : "Not checked", health?.service || "Check the admin namespace"],
    [Database, "Database", "Not reported", "The current admin health API does not expose database status."],
    [CloudRain, "Weather service", "Not reported", "Telemetry is monitored from the Operations page."],
    [HardDrive, "Storage", "Not reported", "The current admin health API does not expose storage status."],
  ];

  async function refreshSettings() { await refresh(); setLastSync(new Date()); }
  return <div className="page-enter grid gap-5"><section className="rounded-md border border-slate-200 bg-gradient-to-r from-him-pine to-[#245846] p-5 text-white shadow-sm"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-100"><ShieldCheck className="h-3.5 w-3.5" /> Platform control</p><div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black">Service health and runtime configuration</h2><p className="mt-1 text-sm font-medium text-emerald-50">Last sync: {lastSync ? lastSync.toLocaleString() : "Loaded for this session"}</p></div><div className="flex gap-2"><Button onClick={checkHealth}>Run health check</Button><Button onClick={refreshSettings} variant="secondary">Refresh settings</Button></div></div></section>{healthError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-him-crimson">{healthError}</p>}<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{healthCards.map(([Icon, label, status, detail]) => <article className="command-card rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={label}><Icon className="h-4 w-4 text-him-river" /><div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-950">{label}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${status === "Operational" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{status}</span></div><p className="mt-2 text-xs font-medium leading-5 text-slate-500">{detail}</p></article>)}</section><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-him-river"><Server className="h-4 w-4" /> Runtime configuration</p><h3 className="mt-1 text-sm font-black text-slate-950">Shared backend details</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{settings.map(([label, value]) => <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={label}><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 break-all text-sm font-bold text-slate-950">{value || "Not returned"}</p></div>)}</div></section><section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-him-crimson"><Workflow className="h-4 w-4" /> Command readiness</p><h3 className="mt-1 text-sm font-black text-slate-950">Integration status</h3><div className="mt-4 grid gap-3 text-sm"><StatusRow label="Centralized API client" value="Enabled" /><StatusRow label="Live refresh readiness" value="Polling active" /><StatusRow label="Environment configuration" value={API_URL ? "Configured" : "Missing"} /></div></section></div></div>;
}

function StatusRow({ label, value }) { return <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3"><span className="text-xs font-bold text-slate-600">{label}</span><span className="text-xs font-black text-him-pine">{value}</span></div>; }
