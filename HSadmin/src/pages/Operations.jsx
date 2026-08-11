import { useState } from "react";
import { AlertTriangle, Bus, CloudRain, Gauge, Pencil, Plus, Radio, Trash2, Waves } from "lucide-react";

import { createOperation, deleteOperation, listTransit, listWeather, updateOperation } from "../api/operations";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import { useFetch } from "../hooks/useFetch";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
import { formatDateTime } from "../utils/format";

const emptyWeather = { station_name: "", district: "Shimla", rainfall_1hr_mm: 0, river_stage_m: 0, temperature_c: 15 };
const emptyRoute = { route_name: "", origin: "", destination: "", current_status: "Operational", key_hazard_zone: "" };
const protectedWeatherFields = ["id", "dashboard_status", "takri_status_label", "last_ping", "updated_at", "is_closed", "closure_reason"];

export default function Operations() {
  const weather = useFetch(listWeather);
  const transit = useFetch(listTransit);
  const [editor, setEditor] = useState(null);
  const [actionError, setActionError] = useState("");
  useLiveRefresh(weather.refresh);
  useLiveRefresh(transit.refresh);

  if ((weather.loading && !weather.data) || (transit.loading && !transit.data)) return <Loader label="Loading operations telemetry" />;

  async function save(event) {
    event.preventDefault();
    setActionError("");
    try {
      const { resource, form } = editor;
      if (form.id) await updateOperation(resource, form.id, form);
      else await createOperation(resource, form);
      setEditor(null);
      await Promise.all([weather.refresh(), transit.refresh()]);
    } catch (err) {
      setActionError(err.message || "Operations save failed.");
    }
  }

  async function remove(resource, id) {
    setActionError("");
    try {
      await deleteOperation(resource, id);
      await Promise.all([weather.refresh(), transit.refresh()]);
    } catch (err) {
      setActionError(err.message || "Operations delete failed.");
    }
  }

  const weatherAlerts = (weather.data || []).filter((station) => station.dashboard_status !== "Normal");
  const closures = (transit.data || []).filter((route) => route.is_closed || route.current_status === "Blocked");
  const edit = (resource, form) => setEditor({ resource, form: { ...form } });

  return (
    <div className="page-enter grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      {actionError && <p className="2xl:col-span-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-him-crimson">{actionError}</p>}
      <OperationSection icon={CloudRain} title="Live weather nodes" onAdd={() => setEditor({ resource: "weather-nodes", form: emptyWeather })}>
        {(weather.data || []).map((station) => <article className="command-card rounded-md border border-slate-200 bg-slate-50 p-3" key={station.id}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-950">{station.station_name}</p><p className="mt-1 text-xs font-medium text-slate-500">{station.district} / {station.dashboard_status}</p></div><span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-black uppercase text-sky-900">{station.takri_status_label}</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-slate-700"><span>Rain {station.rainfall_1hr_mm} mm</span><span>River {station.river_stage_m} m</span><span>{formatDateTime(station.last_ping)}</span></div>
          <Actions onDelete={() => remove("weather-nodes", station.id)} onEdit={() => edit("weather-nodes", station)} />
        </article>)}
      </OperationSection>
      <OperationSection icon={Bus} title="Mountain route state" onAdd={() => setEditor({ resource: "bus-routes", form: emptyRoute })}>
        {(transit.data || []).map((route) => <article className="command-card rounded-md border border-slate-200 bg-slate-50 p-3" key={route.id}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-950">{route.route_name}</p><p className="mt-1 text-xs font-medium text-slate-500">{route.origin} to {route.destination}</p></div><span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase ${route.is_closed ? "border border-rose-200 bg-rose-50 text-him-crimson" : "border border-emerald-200 bg-emerald-50 text-emerald-900"}`}><Radio className="h-3 w-3" /> {route.current_status}</span></div>
          <p className="mt-3 text-xs font-semibold text-slate-600">{route.closure_reason || route.key_hazard_zone || "No active route hazard reported."}</p>
          <Actions onDelete={() => remove("bus-routes", route.id)} onEdit={() => edit("bus-routes", route)} />
        </article>)}
      </OperationSection>
      <TelemetryPanel closures={closures} weather={weather.data || []} weatherAlerts={weatherAlerts} />
      {editor && <Modal onClose={() => setEditor(null)} title={`${editor.form.id ? "Edit" : "Add"} operations record`}><form className="grid gap-3" onSubmit={save}>{Object.keys(editor.form).filter((key) => !protectedWeatherFields.includes(key)).map((key) => <input className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-him-river" key={key} onChange={(event) => setEditor({ ...editor, form: { ...editor.form, [key]: event.target.value } })} placeholder={key.replaceAll("_", " ")} value={editor.form[key] ?? ""} />)}<div className="flex justify-end gap-2"><Button onClick={() => setEditor(null)} variant="secondary">Cancel</Button><Button type="submit">Save</Button></div></form></Modal>}
    </div>
  );
}

function OperationSection({ icon: Icon, title, onAdd, children }) {
  return <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-him-river"><Icon className="h-4 w-4" /> Operations</p><h3 className="mt-1 text-sm font-black text-slate-950">{title}</h3></div><Button className="h-8 px-2" onClick={onAdd} variant="secondary"><Plus className="h-3.5 w-3.5" /></Button></div><div className="mt-4 grid gap-3">{children}</div></section>;
}

function Actions({ onEdit, onDelete }) {
  return <div className="mt-3 flex gap-2"><Button className="h-8 px-2" onClick={onEdit} variant="secondary"><Pencil className="h-3.5 w-3.5" /> Edit</Button><Button className="h-8 px-2" onClick={onDelete} variant="danger"><Trash2 className="h-3.5 w-3.5" /></Button></div>;
}

function TelemetryPanel({ closures, weatherAlerts, weather }) {
  const highestRiver = weather.reduce((highest, station) => Math.max(highest, Number(station.river_stage_m || 0)), 0);
  return <aside className="command-card rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-him-crimson"><Radio className="h-3.5 w-3.5" /> Live telemetry</p><h3 className="mt-1 text-sm font-black text-slate-950">Operational watch</h3><div className="mt-4 grid gap-3"><TelemetryRow detail={closures.length ? "Route control attention required" : "No blocked routes reported"} icon={AlertTriangle} label="Road closures" tone="text-him-crimson" value={closures.length} /><TelemetryRow detail="Weather node exception signals" icon={CloudRain} label="Weather warnings" tone="text-sky-700" value={weatherAlerts.length} /><TelemetryRow detail="Highest reported stage" icon={Waves} label="River monitoring" tone="text-him-river" value={`${highestRiver} m`} /><TelemetryRow detail="No bridge telemetry is available yet" icon={Gauge} label="Bridge status" tone="text-slate-600" value="Pending" /></div></aside>;
}

function TelemetryRow({ icon: Icon, label, value, detail, tone }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><span className={`grid h-8 w-8 place-items-center rounded-md bg-white ${tone}`}><Icon className="h-4 w-4" /></span><p className="text-lg font-black tabular-nums text-slate-950">{value}</p></div><p className="mt-2 text-xs font-black text-slate-800">{label}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{detail}</p></div>;
}
