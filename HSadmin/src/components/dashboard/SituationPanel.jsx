import { CloudRain, MapPinned, Radio, Route, ShieldCheck, Siren } from "lucide-react";

import { formatDateTime } from "../../utils/format";

const alertIcons = [Siren, CloudRain, Route, MapPinned];

export default function SituationPanel({ alerts = [], weather = [], transit = [], generatedAt }) {
  const weatherAlerts = weather.filter((station) => station.dashboard_status && station.dashboard_status !== "Normal");
  const blockedRoutes = transit.filter((route) => route.is_closed || route.current_status === "Blocked");
  const liveItems = [
    ...alerts.slice(0, 2).map((alert, index) => ({
      icon: alertIcons[index % alertIcons.length],
      tone: "text-rose-700 bg-rose-50 border-rose-100",
      label: alert.message || alert.title || "Priority complaint requires attention",
      detail: alert.ticket_id || "Complaint escalation",
    })),
    ...weatherAlerts.slice(0, 1).map((station) => ({
      icon: CloudRain,
      tone: "text-sky-800 bg-sky-50 border-sky-100",
      label: `${station.dashboard_status} at ${station.station_name}`,
      detail: `${station.rainfall_1hr_mm} mm rain / river ${station.river_stage_m} m`,
    })),
    ...blockedRoutes.slice(0, 1).map((route) => ({
      icon: Route,
      tone: "text-amber-900 bg-amber-50 border-amber-100",
      label: `${route.route_name} is ${route.current_status}`,
      detail: route.key_hazard_zone || `${route.origin} to ${route.destination}`,
    })),
  ].slice(0, 4);

  return (
    <section className="command-card overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-him-pine to-[#245846] p-5 text-white lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-100">
            <Radio className="h-3.5 w-3.5" /> Current situation
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight">Himachal Pradesh operations picture</h3>
          <p className="mt-1 text-sm font-medium text-emerald-50/90">A live prioritisation view across citizen reports, weather, and mobility.</p>
        </div>
        <div className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-300 align-middle" />
          Updated {generatedAt ? formatDateTime(generatedAt) : "when command data last synced"}
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {liveItems.map(({ icon: Icon, tone, label, detail }) => (
          <article className={`rounded-md border p-3 ${tone}`} key={`${label}-${detail}`}>
            <Icon className="h-4 w-4" />
            <p className="mt-3 text-sm font-black leading-5 text-slate-900">{label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{detail}</p>
          </article>
        ))}
        {!liveItems.length && (
          <article className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 md:col-span-2 xl:col-span-4">
            <ShieldCheck className="h-4 w-4" />
            <p className="mt-3 text-sm font-black">No active escalation alerts</p>
            <p className="mt-1 text-xs font-semibold">The shared backend has not reported a weather, route, or complaint exception.</p>
          </article>
        )}
      </div>
    </section>
  );
}
