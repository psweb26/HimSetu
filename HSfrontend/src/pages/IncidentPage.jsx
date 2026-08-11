import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import IncidentTimeline from "../components/IncidentTimeline";
import LifecycleTimeline from "../components/LifecycleTimeline";
import {
  MapPin,
  FileText,
  Clock3,
  TriangleAlert,
  FileCheck2,
  Map,
  Radio,
  Zap,
  ArrowBigUp,
  Building2,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function normalizeMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function TelemetryCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-sm border border-[var(--him-stone)] bg-white p-3 shadow-xs">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
          {label}
        </p>
      </div>
      <p className={`text-sm font-black ${tone}`}>
        {value}
      </p>
    </div>
  );
}

function PriorityBadge({ priority }) {
  let bgColor = "bg-slate-100 text-slate-700 border-slate-200";
  let icon = "◆";

  if (priority === "critical") {
    bgColor = "bg-[var(--pahadi-crimson)]/10 text-[var(--pahadi-crimson)] border-[var(--pahadi-crimson)]/30";
    icon = "🔴";
  } else if (priority === "high") {
    bgColor = "bg-amber-100 text-amber-700 border-amber-300";
    icon = "🟠";
  } else if (priority === "medium") {
    bgColor = "bg-blue-100 text-blue-700 border-blue-300";
    icon = "🟡";
  } else if (priority === "low") {
    bgColor = "bg-emerald-100 text-emerald-700 border-emerald-300";
    icon = "🟢";
  }

  const labelMap = {
    critical: "Critical Threat",
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-black uppercase tracking-wider ${bgColor}`}>
      <span>{icon}</span>
      {labelMap[priority] || priority}
    </span>
  );
}

function StatusBadge({ status }) {
  let bgColor = "bg-slate-100 text-slate-700";

  if (status === "Pending") {
    bgColor = "bg-amber-100 text-amber-700";
  } else if (status === "Under Verification") {
    bgColor = "bg-blue-100 text-blue-700";
  } else if (status === "Department Assigned") {
    bgColor = "bg-sky-100 text-sky-700";
  } else if (status === "Verified Resolved") {
    bgColor = "bg-emerald-100 text-emerald-700";
  } else if (status === "Reopened via Citizen Veto") {
    bgColor = "bg-[var(--pahadi-crimson)]/10 text-[var(--pahadi-crimson)]";
  }

  const liveIndicator = status === "Pending" || status === "Under Verification";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-sm border border-current/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${bgColor}`}>
        {liveIndicator && <Radio className="h-2.5 w-2.5 animate-pulse" aria-hidden="true" />}
        {status}
      </span>
    </div>
  );
}

export default function IncidentPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const openMap = () => {
    window.open(
      `https://www.google.com/maps?q=${data.asset.lat},${data.asset.lon}`,
      "_blank",
    );
  };

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/incidents/${id}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error("Failed to load incident");
        }
        return r.json();
      })
      .then((payload) => ({
        ...payload,
        incident: {
          ...payload.incident,
          primary_image_url: normalizeMediaUrl(payload.incident?.primary_image_url),
          gallery_images: (payload.incident?.gallery_images || []).map((item) => ({
            ...item,
            image_url: normalizeMediaUrl(item.image_url),
          })),
        },
        evidence: (payload.evidence || []).map((item) => ({
          ...item,
          image_url: normalizeMediaUrl(item.image_url),
        })),
      }))
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [id]);

  if (error) {
    return (
      <div className="p-10 text-center">
        <div className="inline-flex items-start gap-3 rounded-sm border border-[var(--pahadi-crimson)]/30 bg-rose-50 p-4">
          <TriangleAlert className="h-5 w-5 shrink-0 text-[var(--pahadi-crimson)] mt-0.5" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--pahadi-crimson)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm font-semibold text-slate-500">Loading Incident...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* COMMAND PANEL HEADER */}
      <div className="kathkuni-card bg-white p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--him-stone)] pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)] bg-amber-100 px-2 py-1 rounded-xs">
                Live Telemetry
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                Incident Command Console
              </span>
            </div>
            <h1 className="text-xl font-black text-[var(--devdar-forest)] uppercase tracking-tight">
              {data.incident.title || data.asset.name}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              {data.asset.asset_type} • {data.asset.district} District
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <PriorityBadge priority={data.incident.priority || "medium"} />
            <StatusBadge status={data.incident.current_state} />
          </div>
        </div>

        {/* TOP: INCIDENT ID, PRIORITY, STATUS, LIVE INDICATOR */}
        <div className="grid gap-3 md:grid-cols-4">
          <TelemetryCard
            icon={FileText}
            label="Incident ID"
            value={data.incident.ticket_id || data.incident.id || "N/A"}
            tone="text-[var(--devdar-forest)]"
          />
          <TelemetryCard
            icon={MapPin}
            label="District / Block"
            value={`${data.incident.district || data.asset.district} / ${data.incident.block || "N/A"}`}
            tone="text-[var(--devdar-forest)]"
          />
          <TelemetryCard
            icon={Zap}
            label="Infrastructure"
            value={data.incident.event_type || data.asset.asset_type || "N/A"}
            tone="text-amber-700"
          />
          <TelemetryCard
            icon={Clock3}
            label="Created"
            value={data.summary?.created_date ? new Date(data.summary.created_date).toLocaleString("en-IN") : "N/A"}
            tone="text-slate-700"
          />
        </div>
      </div>

      {(data.incident.primary_image_url || data.incident.gallery_images?.length > 0) && (
        <section className="kathkuni-card bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="overflow-hidden rounded-sm border border-[var(--him-stone)] bg-slate-100">
              {data.incident.primary_image_url ? (
                <img
                  src={data.incident.primary_image_url}
                  alt=""
                  className="h-72 w-full object-cover"
                />
              ) : (
                <div className="grid h-72 place-items-center text-xs font-bold uppercase text-slate-400">
                  No primary image
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Evidence Gallery
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(data.incident.gallery_images || []).map((image) => (
                  <div
                    key={`${image.id}-${image.upload_order}`}
                    className="relative overflow-hidden rounded-sm border border-[var(--him-stone)] bg-slate-100"
                  >
                    <img
                      src={image.image_url}
                      alt=""
                      className="h-24 w-full object-cover"
                    />
                    {image.is_primary && (
                      <span className="absolute left-1 top-1 rounded-sm bg-white/90 px-1.5 py-0.5 text-[8px] font-black uppercase text-[var(--devdar-forest)]">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LIFECYCLE PROGRESS TIMELINE */}
      <LifecycleTimeline status={data.incident.current_state} />

      {/* BOTTOM TELEMETRY METRICS */}
      <div className="grid gap-4 lg:grid-cols-4">
        <TelemetryCard
          icon={Radio}
          label="SLA Status"
          value={data.summary?.sla_status || "On Track"}
          tone="text-emerald-700"
        />
        <TelemetryCard
          icon={ArrowBigUp}
          label="Community Upvotes"
          value={data.summary?.upvotes || "0"}
          tone="text-[var(--kinnaur-marigold)]"
        />
        <TelemetryCard
          icon={Building2}
          label="Assigned Department"
          value={data.incident.department || "Pending"}
          tone="text-sky-700"
        />
        <TelemetryCard
          icon={FileCheck2}
          label="Evidence Records"
          value={data.summary?.evidence_count || "0"}
          tone="text-indigo-700"
        />
      </div>

      {/* TIMELINE & EVIDENCE SECTION */}
      <section className="kathkuni-card bg-white p-6">
        <div className="border-b border-[var(--him-stone)] pb-4 mb-6">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
              Operational Audit Trail
            </span>
          </div>
          <h2 className="text-base font-black text-[var(--devdar-forest)] uppercase tracking-tight">
            Incident Timeline & Evidence
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Chronological progression and supporting documentation.
          </p>
        </div>

        <IncidentTimeline data={data} />
      </section>
    </div>
  );
}
