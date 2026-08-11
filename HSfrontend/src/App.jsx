import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowBigUp,
  Building2,
  Flame,
  Clock3,
  CloudLightning,
  FileText,
  Layers,
  ShieldCheck,
  ThumbsUp,
  CalendarDays,
  Gauge,
  ImagePlus,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCcw,
  Siren,
  Sparkles,
  TimerReset,
  UserRound,
  ArrowRight,
  X,
  XCircle,
} from "lucide-react";

import IncidentQueue from "./components/IncidentQueue";
import GrievanceForm from "./components/GrievanceForm";

import LiveTicketTelemetry from "./components/LiveTicketTelemetry";
import dummyEvidence from "./assets/images/dummy_evidence.png";
import HimachalVectorMap from "./components/HimachalVectorMap";
import IdentityMosaic from "./components/IdentityMosaic";
import himachalCrest from "./assets/images/himachal-crest.png";
import hamariVirasatHero from "./assets/images/hamari-virasat-village-hero.png";
import { COMPREHENSIVE_HERITAGE_REGISTRY } from "./assets/data/culturalData";

const ACTIVE_VIEW_STORAGE_KEY = "hp-municipal-active-view";
const UPVOTE_CRITICAL_THRESHOLD = 30;
const FLASH_FLOOD_RISK = "Flash Flood Khud Proximity";
const CLOCK_INTERVAL_MS = 60_000;
const APP_CLOCK_STARTED_AT_MS = new Date().getTime();
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const views = [
  {
    id: "civic",
    label: "जन पुकार",
    subtitle: "Civic Accountability Core",
    description: "Community infrastructure oversight & social prioritization",
    icon: UserRound,
  },
  {
    id: "telemetry",
    label: "हिमाचली संवाद",
    subtitle: "Live Telemetry & Communication",
    description: "Weather alerts & transit network monitoring",
    icon: Activity,
  },
  {
    id: "heritage",
    label: "हमारी विरासत",
    subtitle: "The Cultural Canvas",
    description: "Regional traditions & identity anchoring",
    icon: Sparkles,
  },
];

const hpLocationMatrix = [
  {
    district: "Kullu",
    blocks: [
      { block: "Anni", panchayats: ["Draman", "Kungash", "Lajheri"] },
      { block: "Bhuntar", panchayats: ["Bari", "Sainj", "Jari"] },
      { block: "Nirmand", panchayats: ["Arsu", "Deem", "Bagi Sarahan"] },
    ],
  },
  {
    district: "Mandi",
    blocks: [
      { block: "Seraj", panchayats: ["Bali Chowki", "Thunag", "Janjehli"] },
      { block: "Drang", panchayats: ["Katindhi", "Pali", "Uhal"] },
      { block: "Balh", panchayats: ["Kummi", "Gagal", "Ratti"] },
    ],
  },
  {
    district: "Shimla",
    blocks: [
      { block: "Rohru", panchayats: ["Chirgaon", "Samoli", "Pujarli"] },
      { block: "Mashobra", panchayats: ["Baldeyan", "Bhont", "Dhalli"] },
      { block: "Theog", panchayats: ["Matiana", "Kiari", "Deha"] },
    ],
  },
  {
    district: "Kangra",
    blocks: [
      { block: "Baijnath", panchayats: ["Paprola", "Bir", "Kothi Kohar"] },
      {
        block: "Dharamshala",
        panchayats: ["Rakkar", "Tang Narwana", "Sidhpur"],
      },
      { block: "Nurpur", panchayats: ["Rehan", "Sadwan", "Bassa Waziran"] },
    ],
  },
  {
    district: "Lahaul & Spiti",
    blocks: [
      { block: "Keylong", panchayats: ["Sissu", "Gondhla", "Jispa"] },
      { block: "Kaza", panchayats: ["Kibber", "Langza", "Tabo"] },
      { block: "Udaipur", panchayats: ["Triloknath", "Miyar", "Tindi"] },
    ],
  },
];

const terrainRisks = [
  "Landslide Vulnerable Link",
  "Flash Flood Khud Proximity",
  "High-Alpine Alpine Track",
  "Standard Rural Road",
];

const infrastructureTypes = [
  "Connecting Bailey Bridge",
  "Drinking Water Line",
  "NH Highway Link",
  "Power Grid Substation",
];

const infrastructureDepartment = {
  "Connecting Bailey Bridge": "Public Works Department",
  "Drinking Water Line": "Jal Shakti Vibhag",
  "NH Highway Link": "National Highways Wing",
  "Power Grid Substation": "HPSEBL Operations",
};

const priorityLabel = {
  critical: "Critical Threats",
  high: "High Threat",
  medium: "Medium",
  low: "Low",
};

const inputClass =
  "w-full rounded-xl border border-white/40 bg-white/70 px-4 py-3 text-sm backdrop-blur-sm " +
  "text-slate-900 outline-none transition placeholder:text-slate-400 " +
  "focus:border-[var(--him-pine)] focus:ring-2 focus:ring-[var(--him-pine)]/20 shadow-[var(--glass-shadow)]";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function normalizeMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizeGrievance(ticket) {
  if (!ticket) return null;
  const ticketId = ticket.ticket_id || ticket.id;
  return {
    ...ticket,
    id: ticketId,
    ticketId,
    incidentId: ticket.incident_id || ticket.incidentId || null,
    title: ticket.title || "Untitled incident",
    description: ticket.description || "",
    district: ticket.district || "",
    block: ticket.block || "",
    panchayat: ticket.panchayat || "",
    citizenName: ticket.citizenName || "Anonymous",
    upvotes: Number(ticket.upvotes || 0),
    terrainRisk: ticket.terrainRisk || ticket.terrain_risk || "Standard Rural Road",
    infrastructureType:
      ticket.infrastructureType ||
      ticket.infrastructure_type ||
      "Connecting Bailey Bridge",
    department: ticket.department || "Unassigned",
    priority: ticket.priority || "medium",
    status: ticket.status || "Pending",
    createdAt: ticket.created_at || ticket.createdAt || new Date().toISOString(),
    slaDueAt: ticket.sla_due_date || ticket.slaDueAt || new Date().toISOString(),
    intakePhotoUrl: normalizeMediaUrl(ticket.intakePhotoUrl || ticket.intake_photo_url),
    evidenceCount: Number(ticket.evidenceCount || ticket.evidence_count || 0),
    isVerified: Boolean(ticket.is_verified || ticket.isVerified),
    resolutionNotes: ticket.resolutionNotes || "",
    validationImageUrl: normalizeMediaUrl(ticket.validationImageUrl || ""),
  };
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function offsetDate(hoursFromNow) {
  return addHours(new Date(), hoursFromNow).toISOString();
}

function createSeedGrievance({
  hoursAgo,
  slaHours,
  resolutionNotes = "",
  validationImageUrl = "",
  vetoRemarks = "",
  ...ticket
}) {
  const createdAt = offsetDate(-hoursAgo);

  return {
    ...ticket,
    department: infrastructureDepartment[ticket.infrastructureType],
    createdAt,
    slaDueAt: offsetDate(slaHours - hoursAgo),
    resolutionNotes,
    validationImageUrl,
    vetoRemarks,
  };
}

const initialGrievances = [
  createSeedGrievance({
    id: "HP-MON-2401",
    title: "Bailey bridge deck plates buckling near Sainj market",
    description:
      "Community crossing over the khud is vibrating under school bus traffic after overnight rainfall.",
    district: "Kullu",
    block: "Bhuntar",
    panchayat: "Sainj",
    upvotes: 42,
    terrainRisk: "Flash Flood Khud Proximity",
    infrastructureType: "Connecting Bailey Bridge",
    priority: "critical",
    status: "Pending",
    hoursAgo: 3,
    slaHours: 6,
  }),
  createSeedGrievance({
    id: "HP-MON-2402",
    title: "Road retaining wall slipping on Seraj orchard link",
    description:
      "The lower shoulder has opened a visible crack and loose stone is falling onto the bus route.",
    district: "Mandi",
    block: "Seraj",
    panchayat: "Thunag",
    upvotes: 29,
    terrainRisk: "Landslide Vulnerable Link",
    infrastructureType: "NH Highway Link",
    priority: "high",
    status: "Under Verification",
    hoursAgo: 14,
    slaHours: 24,
  }),
  createSeedGrievance({
    id: "HP-MON-2403",
    title: "Gravity water line washed out above Draman",
    description:
      "Two hamlets are reporting no drinking water after the exposed pipe snapped at the nala crossing.",
    district: "Kullu",
    block: "Anni",
    panchayat: "Draman",
    upvotes: 18,
    terrainRisk: "Flash Flood Khud Proximity",
    infrastructureType: "Drinking Water Line",
    priority: "high",
    status: "Pending",
    hoursAgo: 8,
    slaHours: 18,
  }),
  createSeedGrievance({
    id: "HP-MON-2404",
    title: "Snowmelt erosion along Kibber service track",
    description:
      "High-altitude track shoulders are narrowing and emergency vehicle access is now unreliable.",
    district: "Lahaul & Spiti",
    block: "Kaza",
    panchayat: "Kibber",
    upvotes: 12,
    terrainRisk: "High-Alpine Alpine Track",
    infrastructureType: "Power Grid Substation",
    priority: "high",
    status: "Pending",
    hoursAgo: 22,
    slaHours: 36,
  }),
  createSeedGrievance({
    id: "HP-MON-2405",
    title: "Shimla ridge feeder road drainage blocked",
    description:
      "Silted cross-drain is forcing runoff onto the carriageway and undercutting a retaining edge.",
    district: "Shimla",
    block: "Mashobra",
    panchayat: "Baldeyan",
    upvotes: 8,
    terrainRisk: "Standard Rural Road",
    infrastructureType: "NH Highway Link",
    priority: "medium",
    status: "Verified Resolved",
    hoursAgo: 48,
    slaHours: 72,
    resolutionNotes:
      "Cross-drain cleared, shoulder packed, and runoff redirected with temporary stone pitching.",
    validationImageUrl:
      "https://images.example.org/hp/mashobra-drainage-clearance.jpg",
  }),
  createSeedGrievance({
    id: "HP-MON-2406",
    title: "Dharamshala substation approach waterlogged",
    description:
      "Approach road to the power switching yard is collecting runoff and equipment access is delayed.",
    district: "Kangra",
    block: "Dharamshala",
    panchayat: "Rakkar",
    upvotes: 35,
    terrainRisk: "Landslide Vulnerable Link",
    infrastructureType: "Power Grid Substation",
    priority: "critical",
    status: "Pending",
    hoursAgo: 5,
    slaHours: 12,
  }),
];

function App() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === "undefined") {
      return "civic";
    }

    const storedView = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    return views.some((view) => view.id === storedView) ? storedView : "civic";
  });
  const [grievances, setGrievances] = useState(initialGrievances);
  const [clockTicks, setClockTicks] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const nowMs = APP_CLOCK_STARTED_AT_MS + clockTicks * CLOCK_INTERVAL_MS;

  const loadGrievances = useCallback(async () => {
    const response = await fetch(`${BACKEND_URL}/api/community-discovery`);
    if (!response.ok) {
      throw new Error("Failed to load community discovery feed.");
    }
    const payload = await response.json();
    setGrievances(Array.isArray(payload) ? payload.map(normalizeGrievance) : []);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
    }
  }, [activeView]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTicks((tick) => tick + 1);
    }, CLOCK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    loadGrievances().catch((err) => {
      console.error(err);
    });
  }, [loadGrievances]);

  function handleCreateGrievance(form) {
    const priority = derivePriorityFromTerrain(form.terrainRisk);
    const now = new Date();
    const ticket = {
      id: `HP-MON-${now.getTime().toString(36).toUpperCase()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      district: form.district,
      block: form.block,
      panchayat: form.panchayat,
      upvotes: 0,
      terrainRisk: form.terrainRisk,
      infrastructureType: form.infrastructureType,
      department: infrastructureDepartment[form.infrastructureType],
      priority,
      status: "Pending",
      createdAt: now.toISOString(),
      slaDueAt: addHours(now, priorityToSlaHours(priority)).toISOString(),
      intakePhotoUrl: form.intakePhotoUrl.trim(),
      citizenName: form.citizenName.trim(),
      resolutionNotes: "",
      validationImageUrl: "",
      vetoRemarks: "",
    };

    setGrievances((current) => [ticket, ...current]);
    return ticket;
  }

  async function handleUpvote(ticketId) {
    const response = await fetch(`${BACKEND_URL}/api/grievances/${ticketId}/upvote`, {
      method: "POST",
    });
    if (!response.ok) return;
    const updated = normalizeGrievance(await response.json());
    setGrievances((current) =>
      current.map((ticket) => (ticket.id === ticketId ? updated : ticket)),
    );
  }

  async function handleResolve(ticketId, resolutionNotes, validationImageUrl) {
    const response = await fetch(`${BACKEND_URL}/api/grievances/${ticketId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionNotes, validationImageUrl }),
    });
    if (response.ok) {
      await loadGrievances();
    }
  }

  async function handleVeto(ticketId, vetoRemarks) {
    const response = await fetch(`${BACKEND_URL}/api/grievances/${ticketId}/veto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ veto_remarks: vetoRemarks }),
    });
    if (response.ok) {
      await loadGrievances();
    }
  }

  function openIncident(ticket) {
    const ticketId = ticket?.id || ticket?.ticketId || ticket?.ticket_id;
    if (ticketId) {
      navigate(`/incidents/${ticketId}`);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--spiti-snow)] text-slate-900 selection:bg-[var(--dry-wool)]">
      <MonsoonAlertTicker />

      <HeaderNavigation activeView={activeView} setActiveView={setActiveView} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeView === "civic" && (
          <CivicPillar
            grievances={grievances}
            onCreateGrievance={handleCreateGrievance}
            onUpvote={handleUpvote}
            onResolve={handleResolve}
            onVeto={handleVeto}
            onRefresh={loadGrievances}
            onOpenIncident={openIncident}
            backendUrl={BACKEND_URL}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            nowMs={nowMs}
          />
        )}

        {activeView === "telemetry" && (
          <TelemetryPillar grievances={grievances} nowMs={nowMs} />
        )}
        {activeView === "heritage" && <HeritagePillar />}
      </div>
    </main>
  );
}

function MonsoonAlertTicker() {
  const bulletins = [
    "🌧️ IMD ORANGE ALERT: Heavy rainfall expected in Mandi & Kullu districts. Flash flood risk high over next 48 hours.",
    "⚠️ Kangra hill slopes under watch: waterlogged feeder roads and substation access corridors require immediate inspection.",
    "❄️ Lahaul & Spiti high-alpine tracks reporting rapid snowmelt runoff. Bailey bridge crews remain on standby.",
  ];

  return (
    <section className="border-b border-[var(--pahadi-crimson)]/30 bg-rose-50 text-[var(--pahadi-crimson)]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[var(--pahadi-crimson)]/40 bg-white text-[var(--pahadi-crimson)] shadow-2xs">
          <CloudLightning className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex gap-12 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">
            {[...bulletins, ...bulletins].map((bulletin, index) => (
              <span
                className="inline-flex items-center gap-3"
                key={`${bulletin}-${index}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--pahadi-crimson)] animate-pulse" />
                {bulletin}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeaderNavigation({ activeView, setActiveView }) {
  return (
    <div className="border-b border-[var(--dry-wool)] bg-white shadow-xs relative">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-5 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-sm border border-[var(--dry-wool)] bg-white p-0.5 shadow-2xs">
              <img
                src={himachalCrest}
                alt="Dev Bhoomi Governance Crest"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                HimSetu • Unified Civic Platform
              </p>
              <h1 className="truncate text-lg font-black text-[var(--devdar-forest)] uppercase tracking-tight">
                Himachal Pradesh Accountability Network
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-800 shadow-2xs">
              <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
              Live Telemetry
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--dry-wool)] bg-slate-50 px-2.5 py-1.5 text-slate-700 shadow-2xs">
              <Flame className="h-3 w-3 text-[var(--pahadi-crimson)]" />
              Monsoon Active
            </span>
          </div>
        </div>

        <div className="grid gap-2 rounded-sm border border-[var(--dry-wool)] bg-slate-50 p-1 md:grid-cols-3">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;

            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={cx(
                  "flex flex-col gap-0.5 rounded-sm px-4 py-2.5 text-left transition-all duration-150",
                  isActive
                    ? "bg-[var(--devdar-forest)] text-white shadow-xs border-b-2 border-[var(--kinnaur-marigold)]"
                    : "text-slate-700 hover:bg-white hover:text-slate-900",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cx(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-[var(--kinnaur-marigold)]"
                        : "text-slate-400",
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {view.label}
                  </span>
                </div>
                <span
                  className={cx(
                    "text-[10px] font-medium",
                    isActive ? "text-slate-300" : "text-slate-500",
                  )}
                >
                  {view.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="himachali-weave-divider" />
    </div>
  );
}

function calculateRemainingSla(ticket, nowMs) {
  const remainingMs = new Date(ticket.slaDueAt).getTime() - nowMs;

  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));

  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatRelativeTime(timestamp, nowMs) {
  const diff = nowMs - new Date(timestamp).getTime();

  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function CivicPillar({
  grievances,
  onCreateGrievance,
  onUpvote,
  onResolve,
  onVeto,
  onRefresh,
  onOpenIncident,
  backendUrl,
  selectedDistrict,
  setSelectedDistrict,
  nowMs,
}) {
  const [form, setForm] = useState(() => {
    const firstDistrict = hpLocationMatrix[0];
    const firstBlock = firstDistrict.blocks[0];

    return {
      citizenName: "",
      district: firstDistrict.district,
      block: firstBlock.block,
      panchayat: firstBlock.panchayats[0],
      infrastructureType: "Connecting Bailey Bridge",
      terrainRisk: "Flash Flood Khud Proximity",
      title: "",
      description: "",
      intakePhotoUrl: "",
    };
  });

  const [latestTicket, setLatestTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const selectedDistrictConfig = hpLocationMatrix.find(
    (entry) => entry.district === form.district,
  );
  const blockOptions = selectedDistrictConfig?.blocks || [];

  // const feed = useMemo(() => {
  //   let result = [...grievances];

  //   if (selectedDistrict) {
  //     result = result.filter(
  //       (t) => t.district.toLowerCase() === selectedDistrict.toLowerCase(),
  //     );
  //   }

  //   return result.sort((left, right) => {
  //     const scoreDelta =
  //       calculateCompositeScore(right) - calculateCompositeScore(left);
  //     if (scoreDelta !== 0) {
  //       return scoreDelta;
  //     }

  //     const upvoteDelta = right.upvotes - left.upvotes;
  //     if (upvoteDelta !== 0) {
  //       return upvoteDelta;
  //     }
  //     return (
  //       new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  //     );
  //   });
  // }, [grievances, selectedDistrict]);

  const telemetryTicket = latestTicket
    ? grievances.find((ticket) => ticket.id === latestTicket.id) || latestTicket
    : null;

  const telemetryLocation = telemetryTicket
    ? `${telemetryTicket.district} • ${telemetryTicket.block} • ${telemetryTicket.panchayat}`
    : "";

  const effectivePriority = telemetryTicket
    ? getEffectivePriority(telemetryTicket)
    : "low";

  const priorityMap = {
    critical: {
      label: "Critical",
      colorClass: "border-rose-200 bg-rose-50 text-rose-800",
    },
    high: {
      label: "High",
      colorClass: "border-amber-200 bg-amber-50 text-amber-800",
    },
    medium: {
      label: "Medium",
      colorClass: "border-sky-200 bg-sky-50 text-sky-800",
    },
    low: {
      label: "Low",
      colorClass: "border-slate-200 bg-slate-50 text-slate-700",
    },
  };

  const metadata = telemetryTicket
    ? [
        {
          icon: Layers,
          value: telemetryTicket.infrastructureType,
        },
        {
          icon: ShieldCheck,
          value: telemetryTicket.terrainRisk,
        },
        {
          icon: Building2,
          value: telemetryTicket.department,
        },
      ]
    : [];

  const metrics = telemetryTicket
    ? [
        {
          label: "UPVOTES",
          icon: ThumbsUp,
          val: telemetryTicket.upvotes,
        },
        {
          label: "SLA",
          icon: Clock3,
          val: calculateRemainingSla(telemetryTicket, nowMs),
        },
        {
          label: "REPORTED",
          icon: CalendarDays,
          val: formatDateTime(telemetryTicket.createdAt),
        },
      ]
    : [];

  const confidence =
    telemetryTicket?.upvotes > 35
      ? "Very High"
      : telemetryTicket?.upvotes > 20
        ? "High"
        : telemetryTicket?.upvotes > 10
          ? "Medium"
          : "Low";

  const confidenceBarStyle = {
    Low: "bg-slate-500 w-1/4",
    Medium: "bg-amber-500 w-2/4",
    High: "bg-emerald-700 w-3/4",
    "Very High": "bg-emerald-800 w-full",
  }[confidence];

  const lastUpdated = telemetryTicket
    ? formatRelativeTime(telemetryTicket.createdAt, nowMs)
    : "";

  function updateForm(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "district") {
        const district = hpLocationMatrix.find(
          (entry) => entry.district === value,
        );
        const firstBlock = district?.blocks[0];
        next.block = firstBlock?.block || "";
        next.panchayat = firstBlock?.panchayats[0] || "";

        if (setSelectedDistrict) {
          setSelectedDistrict(value);
        }
      }

      if (field === "block") {
        const block = blockOptions.find((entry) => entry.block === value);
        next.panchayat = block?.panchayats[0] || "";
      }

      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const newTicket = onCreateGrievance(form);

    setLatestTicket(newTicket);

    setForm((current) => ({
      ...current,
      title: "",
      description: "",
      intakePhotoUrl: "",
    }));
  }

  async function handleBackendSubmission(ticket) {
    const normalized = normalizeGrievance(ticket);
    if (normalized) {
      setLatestTicket(normalized);
    }
    await onRefresh?.();
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden relative">
        <div className="flex-1 space-y-2">
          <span className="text-[10px] bg-[var(--kinnaur-marigold)] text-slate-950 font-black px-2.5 py-1 rounded-2xs uppercase tracking-widest">
            Public Interface Core
          </span>
          <h2 className="text-xl font-black text-[var(--devdar-forest)] uppercase tracking-tight">
            जन पुकार / Civic Accountability Dashboard
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            A decentralized oversight network enabling citizens to flag
            structural damage—inspired by regional engineering resilience. Track
            road shoulder failure, cracked retaining walls, or structural strain
            on critical infrastructure links before they escalate into transit
            blockades.
          </p>
        </div>
        <div className="w-32 h-20 shrink-0 bg-slate-100 rounded-sm border border-[var(--dry-wool)] flex flex-col items-center justify-center p-2 text-center text-[10px] font-bold text-slate-500 font-mono">
          <span>KATH-KUNI</span>
          <span className="text-lg mt-0.5">🪵🪨</span>
          <span className="text-[8px] text-slate-400 font-sans mt-0.5">
            Structural Grid Pattern
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[520px_1fr] items-stretch">
        <section className="bg-white p-0 overflow-hidden">
          <GrievanceForm
            backendUrl={backendUrl}
            onSubmission={handleBackendSubmission}
          />
        </section>

        <div className="h-full min-h-[760px]">
          <HimachalVectorMap
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            grievances={grievances}
          />
        </div>
      </div>

      <section className="mt-8">
  {telemetryTicket ? (
    <LiveTicketTelemetry
      ticket={{
        ...telemetryTicket,
        location: telemetryLocation,
      }}
      confidence={confidence}
      confidenceBarStyle={confidenceBarStyle}
      lastUpdated={lastUpdated}
      priorityData={priorityMap[effectivePriority]}
      metadata={metadata}
      metrics={metrics}
      onOpenWorkspace={(id) => {
        const incident = grievances.find((t) => t.id === id);
        onOpenIncident?.(incident || telemetryTicket);
      }}
    />
  ) : (
    <EmptyState
      icon={Activity}
      title="No Active Incident"
      detail="Community reports will appear here once submitted."
    />
  )}
</section>

<IncidentQueue
  tickets={grievances}
  selectedTicketId={selectedTicket?.id}
  onSelectIncident={setSelectedTicket}
  onOpenWorkspace={onOpenIncident}
  onUpvote={onUpvote}
  nowMs={nowMs}
  districts={hpLocationMatrix}
/>

      {selectedTicket && (
        <ResolutionModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onResolve={(notes, image) => {
            onResolve(selectedTicket.id, notes, image);
            setSelectedTicket(null);
          }}
          onVeto={(remarks) => {
            onVeto(selectedTicket.id, remarks);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}

function TelemetryPillar({ grievances, nowMs }) {
  const [refreshing, setRefreshing] = useState(true);
  const [weatherNodes, setWeatherNodes] = useState([]);
  const [transitRoutes, setTransitRoutes] = useState([]);
  const [telemetryError, setTelemetryError] = useState("");

  const requestTelemetry = useCallback(async (signal) => {
    const [weatherResponse, transitResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/api/telemetry/weather`, { signal }),
      fetch(`${BACKEND_URL}/api/telemetry/transit`, { signal }),
    ]);

    if (!weatherResponse.ok || !transitResponse.ok) {
      throw new Error("Telemetry feed request failed.");
    }

    return Promise.all([weatherResponse.json(), transitResponse.json()]);
  }, []);

  const loadTelemetry = useCallback(
    async (signal) => {
      setRefreshing(true);
      setTelemetryError("");

      try {
        const [weatherPayload, transitPayload] = await requestTelemetry(signal);

        setWeatherNodes(Array.isArray(weatherPayload) ? weatherPayload : []);
        setTransitRoutes(Array.isArray(transitPayload) ? transitPayload : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setTelemetryError(
            error.message || "Live telemetry feed is unavailable.",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setRefreshing(false);
        }
      }
    },
    [requestTelemetry],
  );

  useEffect(() => {
    const controller = new AbortController();
    requestTelemetry(controller.signal)
      .then(([weatherPayload, transitPayload]) => {
        setWeatherNodes(Array.isArray(weatherPayload) ? weatherPayload : []);
        setTransitRoutes(Array.isArray(transitPayload) ? transitPayload : []);
        setTelemetryError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setTelemetryError(
            error.message || "Live telemetry feed is unavailable.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [requestTelemetry]);

  const metrics = useMemo(() => {
    const highUpvoteEmergencies = grievances.filter(
      (ticket) => ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD,
    ).length;
    const verifiedResolved = grievances.filter(
      (ticket) => ticket.status === "Verified Resolved",
    ).length;
    const slaBreached = grievances.filter((ticket) =>
      isSlaBreached(ticket, nowMs),
    ).length;

    return {
      totalGrievances: grievances.length,
      highUpvoteEmergencies,
      activePending: grievances.length - verifiedResolved,
      verifiedResolved,
      slaBreached,
    };
  }, [grievances, nowMs]);

  const districtLoadData = useMemo(() => {
    return hpLocationMatrix.map(({ district }) => {
      const districtTickets = grievances.filter(
        (ticket) => ticket.district === district,
      );
      const landslideBridge = districtTickets.filter(
        (ticket) =>
          ticket.terrainRisk === "Landslide Vulnerable Link" ||
          ticket.infrastructureType === "Connecting Bailey Bridge",
      );

      return {
        district,
        Total: districtTickets.length,
        HighUpvote: districtTickets.filter(
          (ticket) => ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD,
        ).length,
        LandslideBridge: landslideBridge.length,
      };
    });
  }, [grievances]);

  const weatherSummary = useMemo(() => {
    const asNumber = (value) => Number.parseFloat(value ?? 0) || 0;
    const highRiskStatuses = new Set([
      "Extreme Cloudburst",
      "Cloudburst",
      "Severe Rainfall",
      "Heavy Rain",
    ]);

    const peak = weatherNodes.reduce(
      (currentPeak, node) => {
        const rainfall = asNumber(node.rainfall_1hr_mm);
        return rainfall > currentPeak.rainfall
          ? { node, rainfall }
          : currentPeak;
      },
      { node: null, rainfall: 0 },
    );

    const averageTemperature =
      weatherNodes.length > 0
        ? weatherNodes.reduce(
            (sum, node) => sum + asNumber(node.temperature_c),
            0,
          ) / weatherNodes.length
        : 0;

    return {
      averageTemperature,
      highRiskStations: weatherNodes.filter((node) =>
        highRiskStatuses.has(node.dashboard_status),
      ).length,
      peakRainfall: peak.rainfall,
      peakStation: peak.node?.station_name || "No station",
      slopeSignals: weatherNodes.filter(
        (node) => node.landslide_sensor_triggered || node.debris_flow_detected,
      ).length,
      totalStations: weatherNodes.length,
    };
  }, [weatherNodes]);

  const transitSummary = useMemo(() => {
    const statusCounts = transitRoutes.reduce((counts, route) => {
      const status = route.current_status || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    return {
      blocked: statusCounts.Blocked || 0,
      delayed: statusCounts.Delayed || 0,
      disrupted: transitRoutes.filter(
        (route) => route.current_status !== "Operational",
      ).length,
      operational: statusCounts.Operational || 0,
      suspended: statusCounts.Suspended || 0,
      totalRoutes: transitRoutes.length,
    };
  }, [transitRoutes]);

  const topWeatherNodes = useMemo(() => {
    return [...weatherNodes]
      .sort(
        (a, b) =>
          Number.parseFloat(b.rainfall_1hr_mm || 0) -
          Number.parseFloat(a.rainfall_1hr_mm || 0),
      )
      .slice(0, 10);
  }, [weatherNodes]);

  const priorityTransitRoutes = useMemo(() => {
    if (!transitRoutes || transitRoutes.length === 0) return [];

    const statusRank = {
      blocked: 0,
      suspended: 1,
      delayed: 2,
      operational: 3,
    };

    return [...transitRoutes].sort((a, b) => {
      const statusA = (a.current_status || "").toLowerCase();
      const statusB = (b.current_status || "").toLowerCase();
      return (statusRank[statusA] ?? 4) - (statusRank[statusB] ?? 4);
    });
  }, [transitRoutes]);

  const weatherStatusStyles = {
    "Extreme Cloudburst": "border-rose-700 bg-rose-100 text-rose-900",
    Cloudburst:
      "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
    "Severe Rainfall": "border-orange-300 bg-orange-50 text-orange-900",
    "Heavy Rain": "border-amber-300 bg-amber-50 text-amber-950",
    "Moderate Rain": "border-sky-300 bg-sky-50 text-sky-900",
    "Light Rain": "border-cyan-200 bg-cyan-50 text-cyan-900",
    Normal: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  const transitStatusStyles = {
    operational: "border-emerald-200 bg-emerald-50 text-emerald-900",
    delayed: "border-amber-300 bg-amber-50 text-amber-950",
    blocked:
      "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
    suspended: "border-slate-300 bg-slate-100 text-slate-800",
  };

  function refreshTelemetry() {
    loadTelemetry();
  }

  function formatTelemetryPing(value) {
    if (!value) return "No ping";

    const pingDate = new Date(value);
    if (Number.isNaN(pingDate.getTime())) return "No ping";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    }).format(pingDate);
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel bg-[linear-gradient(145deg,rgba(12,26,22,.98),rgba(20,35,47,.96))] p-5 text-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <PanelHeader
            eyebrow="CM Office Command Console"
            icon={Gauge}
            title="Executive Weather and Transit Cockpit"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-[10px] font-black uppercase tracking-wider text-slate-100 backdrop-blur-sm">
              <Radio
                className={cx(
                  "h-3.5 w-3.5",
                  refreshing
                    ? "animate-pulse text-[var(--him-marigold)]"
                    : "text-emerald-300",
                )}
                aria-hidden="true"
              />
              {refreshing ? "Syncing" : "Live Feed"}
            </span>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-[var(--glass-shadow)] transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={refreshing}
              onClick={refreshTelemetry}
              type="button"
            >
              {refreshing ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-[var(--him-marigold)]"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCcw
                  className="h-4 w-4 text-[var(--him-marigold)]"
                  aria-hidden="true"
                />
              )}
              Sync Feeds
            </button>
          </div>
        </div>

        {telemetryError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--him-crimson)]/50 bg-[var(--him-crimson)]/20 p-3 text-xs font-semibold text-rose-100">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{telemetryError}</span>
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            icon={CloudLightning}
            label="Weather Nodes"
            surface="border-[var(--dry-wool)] bg-white text-slate-900"
            tone="text-[var(--devdar-forest)]"
            value={weatherSummary.totalStations}
          />
          <KpiCard
            icon={Siren}
            label="High Risk Stations"
            surface="border-[var(--pahadi-crimson)]/30 bg-rose-50 text-[var(--pahadi-crimson)]"
            tone="text-[var(--pahadi-crimson)]"
            value={weatherSummary.highRiskStations}
          />
          <KpiCard
            icon={Activity}
            label="Peak Rainfall MM"
            surface="border-sky-200 bg-sky-50 text-sky-950"
            tone="text-sky-900"
            value={Number(weatherSummary.peakRainfall.toFixed(1))}
          />
          <KpiCard
            icon={Radio}
            label="Transit Routes"
            surface="border-[var(--dry-wool)] bg-white text-slate-900"
            tone="text-[var(--devdar-forest)]"
            value={transitSummary.totalRoutes}
          />
          <KpiCard
            icon={Clock3}
            label="Route Disruptions"
            surface="border-[var(--kinnaur-marigold)]/30 bg-amber-50/60 text-amber-950"
            tone="text-amber-900"
            value={transitSummary.disrupted}
          />
          <KpiCard
            icon={TimerReset}
            label="SLA Breaches"
            surface="border-[var(--pahadi-crimson)]/30 bg-rose-50 text-[var(--pahadi-crimson)]"
            tone="text-[var(--pahadi-crimson)]"
            value={metrics.slaBreached}
          />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <MetricPill
            label="Peak Rain Node"
            value={weatherSummary.peakStation}
          />
          <MetricPill
            label="Average Temperature"
            value={`${Number(weatherSummary.averageTemperature.toFixed(1))}C`}
          />
          <MetricPill
            label="Slope Sensor Signals"
            value={weatherSummary.slopeSignals}
          />
          <MetricPill
            label="Operational Routes"
            value={transitSummary.operational}
          />
          <MetricPill
            label="Blocked / Suspended"
            value={`${transitSummary.blocked} / ${transitSummary.suspended}`}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="kathkuni-card min-w-0 bg-white p-5">
          <PanelHeader
            eyebrow="IMD Climatology Node Grid"
            icon={CloudLightning}
            title="Rainfall, River Stage and Landslide Matrix"
          />

          <div className="mt-5 overflow-hidden rounded-sm border border-[var(--dry-wool)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-[#F5F7FA] text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Station</th>
                    <th className="px-3 py-2.5">Rain</th>
                    <th className="px-3 py-2.5">River</th>
                    <th className="px-3 py-2.5">Temp</th>
                    <th className="px-3 py-2.5">Signal</th>
                    <th className="px-3 py-2.5">Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {topWeatherNodes.map((node) => (
                    <tr
                      key={node.id ?? node.station_name}
                      className="align-top"
                    >
                      <td className="px-3 py-3">
                        <p className="font-black text-[var(--devdar-forest)]">
                          {node.station_name}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {node.district} / {node.terrain_type} /{" "}
                          {node.elevation_m}m
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono font-black tabular-nums text-slate-900">
                        {Number(node.rainfall_1hr_mm || 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold tabular-nums text-slate-700">
                        {Number(node.river_stage_m || 0).toFixed(2)}m
                      </td>
                      <td className="px-3 py-3 font-mono font-bold tabular-nums text-slate-700">
                        {Number(node.temperature_c || 0).toFixed(1)}C
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={cx(
                              "inline-flex w-fit items-center rounded-xs border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                              weatherStatusStyles[node.dashboard_status] ??
                                weatherStatusStyles.Normal,
                            )}
                          >
                            {node.dashboard_status || "Normal"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {node.takri_status_label || "Sthir"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[10px] font-semibold text-slate-500">
                        {formatTelemetryPing(node.last_ping)}
                      </td>
                    </tr>
                  ))}
                  {topWeatherNodes.length === 0 && (
                    <tr>
                      <td
                        className="px-3 py-6 text-center text-xs font-bold text-slate-500"
                        colSpan={6}
                      >
                        Weather telemetry feed is waiting for data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="kathkuni-card min-w-0 bg-white p-5">
          <PanelHeader
            eyebrow="HRTC Corridor Ledger"
            icon={Radio}
            title="Transit Route Status Board"
          />

          <div className="mt-5 grid max-h-[36rem] gap-3 overflow-y-auto pr-1">
            {priorityTransitRoutes.map((route) => (
              <article
                className="rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-3 shadow-2xs"
                key={route.id ?? route.route_name}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black leading-snug text-[var(--devdar-forest)]">
                      {route.route_name}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {route.origin} to {route.destination}
                    </p>
                  </div>
                  <span
                    className={cx(
                      "shrink-0 rounded-xs border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      transitStatusStyles[
                        (route.current_status || "").toLowerCase()
                      ] ?? "border-slate-200 bg-white text-slate-700",
                    )}
                  >
                    {route.current_status || "Unknown"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-[10px] font-semibold text-slate-600 sm:grid-cols-2">
                  <div className="rounded-sm border border-slate-200 bg-white p-2">
                    <p className="font-black uppercase tracking-wider text-slate-400">
                      Hazard Zone
                    </p>
                    <p className="mt-1 text-slate-700">
                      {route.key_hazard_zone}
                    </p>
                  </div>
                  <div className="rounded-sm border border-slate-200 bg-white p-2">
                    <p className="font-black uppercase tracking-wider text-slate-400">
                      Relay
                    </p>
                    <p className="mt-1 text-slate-700">
                      {route.relay_state || "Jagrit"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-600">
                  {route.roznamcha_remarks ||
                    route.hazard_profile ||
                    "No route remarks posted."}
                </p>
              </article>
            ))}
            {priorityTransitRoutes.length === 0 && (
              <div className="rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-6 text-center text-xs font-bold text-slate-500">
                Transit telemetry feed is waiting for data.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="kathkuni-card bg-white p-5">
          <PanelHeader
            eyebrow="Civic Workload Overlay"
            icon={FileText}
            title="Grievance Control Totals"
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricPill
              label="Total Log Registry"
              value={metrics.totalGrievances}
            />
            <MetricPill
              label="Critical Emergencies"
              value={metrics.highUpvoteEmergencies}
            />
            <MetricPill
              label="Active Pending Queue"
              value={metrics.activePending}
            />
            <MetricPill
              label="Verified Resolved"
              value={metrics.verifiedResolved}
            />
          </div>
        </section>

        <section className="kathkuni-card min-w-0 bg-white p-5">
          <PanelHeader
            eyebrow="District Vulnerability Scale"
            icon={Building2}
            title="Infrastructural Burden Allocation Chart"
          />

          <div className="mt-5 h-80 rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-4">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={districtLoadData}
                margin={{ left: -15, right: 8 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="district"
                  fontSize={11}
                  stroke="#475569"
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={11}
                  stroke="#475569"
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid var(--dry-wool)",
                    borderRadius: 4,
                  }}
                />
                <Legend />
                <Bar
                  dataKey="Total"
                  fill="var(--devdar-forest)"
                  radius={[2, 2, 0, 0]}
                  name="Total Registry"
                />
                <Bar
                  dataKey="HighUpvote"
                  fill="var(--pahadi-crimson)"
                  name="Critical Threat Alerts"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="LandslideBridge"
                  fill="var(--kinnaur-marigold)"
                  name="Landslide/Bridge Blockades"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function HeritagePillar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [activeDeckAsset, setActiveDeckAsset] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [liveAssets, setLiveAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const uniqueDistricts = [
    "All",
    "Mandi",
    "Kullu",
    "Kinnaur",
    "Lahaul & Spiti",
    "Chamba",
    "Kangra",
    "Shimla",
    "Sirmaur",
    "Bilaspur",
    "Una & Hamirpur",
    "Solan",
  ];
  const uniqueCategories = [
    "All",
    "State Identity",
    "Geography & Peaks",
    "Rivers & Waterways",
    "Valleys & Canyons",
    "Famous Hill Stations",
    "Hidden Gems & Passes",
    "Famous Lakes",
    "Temples & Monasteries",
    "Eco Systems & Wildlife",
    "Cuisine & Dham",
    "Agriculture & Crops",
    "Languages & Attire",
    "Performing Arts & Fairs",
    "Architecture & Heritage",
  ];

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/cultural-assets`)
      .then((res) => {
        if (!res.ok) throw new Error("Network configuration mismatch.");
        return res.json();
      })
      .then((data) => {
        setLiveAssets(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(
          "API Fetch blocked, utilizing static file backup registry:",
          err,
        );
        const mappedFallback = COMPREHENSIVE_HERITAGE_REGISTRY.map((asset) => ({
          ...asset,
          sub_items: asset.subItems || [],
        }));
        setLiveAssets(mappedFallback);
        setIsLoading(false);
      });
  }, []);

  const filteredAssets = useMemo(() => {
    return liveAssets.filter((asset) => {
      const matchesSearch =
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.specification &&
          asset.specification
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        (asset.pillar_category &&
          asset.pillar_category
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        (asset.sub_items &&
          asset.sub_items.some(
            (sub) =>
              sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              sub.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
              sub.spec.toLowerCase().includes(searchQuery.toLowerCase()),
          ));

      const matchesDistrict =
        selectedDistrictFilter === "All" ||
        asset.title.includes(selectedDistrictFilter) ||
        asset.description.includes(selectedDistrictFilter) ||
        (asset.specification &&
          asset.specification.includes(selectedDistrictFilter)) ||
        (asset.sub_items &&
          asset.sub_items.some(
            (sub) =>
              sub.name.includes(selectedDistrictFilter) ||
              sub.detail.includes(selectedDistrictFilter) ||
              sub.spec.includes(selectedDistrictFilter),
          ));

      const matchesCategory =
        selectedCategoryFilter === "All" ||
        asset.pillar_category === selectedCategoryFilter;

      return matchesSearch && matchesDistrict && matchesCategory;
    });
  }, [liveAssets, searchQuery, selectedDistrictFilter, selectedCategoryFilter]);

  const handleNextSlide = () => {
    if (!activeDeckAsset?.sub_items) return;
    setCarouselIndex((prev) => (prev + 1) % activeDeckAsset.sub_items.length);
  };

  const handlePrevSlide = () => {
    if (!activeDeckAsset?.sub_items) return;
    setCarouselIndex(
      (prev) =>
        (prev - 1 + activeDeckAsset.sub_items.length) %
        activeDeckAsset.sub_items.length,
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--devdar-forest)]" />
        <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
          Syncing Heritage Registry...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <section
        aria-labelledby="heritage-hero-title"
        className="relative isolate flex min-h-[31rem] overflow-hidden bg-[#1b1c16] text-[#f7f1e7] shadow-[0_20px_50px_rgba(29,24,18,0.22)]"
      >
        <img
          alt="Illustrative dawn scene of a traditional Himachali village"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-[64%_center] saturate-[0.72] sepia-[0.12]"
          src={hamariVirasatHero}
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(15,17,13,0.66)_0%,rgba(19,19,14,0.49)_38%,rgba(22,20,15,0.10)_72%,rgba(15,14,11,0.27)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(12,13,10,0.04)_0%,rgba(12,13,10,0.08)_56%,rgba(12,13,10,0.46)_100%)]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-30 mix-blend-soft-light [background-image:radial-gradient(rgba(255,255,255,0.75)_0.6px,transparent_0.7px)] [background-size:5px_5px]"
        />

        <div className="flex w-full flex-col justify-between px-6 py-7 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
          <div className="flex items-start justify-between gap-5">
            <p className="border-l border-[#dfb76e]/70 pl-3 text-[10px] font-bold uppercase tracking-[0.26em] text-[#f5dfb3] sm:text-[11px]">
              Himari Virasat
            </p>
          </div>

          <div className="max-w-4xl pb-10 pt-12 sm:pb-12 sm:pt-16 lg:pb-10 lg:pt-14">
            <h1
              id="heritage-hero-title"
              className="font-heading text-[clamp(3.5rem,7.6vw,6.7rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#fff9ec] [text-shadow:0_4px_24px_rgba(0,0,0,0.42)]"
            >
              हमारी विरासत
            </h1>
            <p className="mt-8 max-w-md border-l-2 border-[#d6a855] pl-4 text-lg font-medium leading-relaxed text-[#f3e9d8] sm:mt-10 sm:text-xl">
              जो बीत गया, वो खोया नहीं है।
            </p>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#eee5d5]/85 sm:text-[11px]">
              A living archive of Himachal Pradesh
            </p>
          </div>

          <div className="flex items-end justify-between gap-4">
            <p className="max-w-52 text-[10px] leading-4 text-[#eee5d5]/65 sm:max-w-xs sm:text-[11px]">
              An original illustrative scene, created for this cultural archive.
            </p>
            <a
              className="group inline-flex items-center gap-3 border-b border-[#e4c37f]/60 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fff4dd] transition hover:border-[#fff4dd] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff4dd]"
              href="#memory-bridge"
            >
              <span aria-hidden="true" className="text-base leading-none transition-transform group-hover:translate-y-0.5">↓</span>
              Explore the memory
            </a>
          </div>
        </div>
      </section>

      <MemoryBridge />

      <div className="hidden">
        <div className="flex-1 space-y-2">
          <span className="text-[10px] bg-[var(--devdar-forest)] text-[#F5F7FA] font-black px-2.5 py-1 rounded-2xs uppercase tracking-widest">
            Identity Ledger Backplane
          </span>
          <h2 className="font-heading text-2xl font-semibold text-[var(--him-pine)] tracking-tight">
            हमारी विरासत / Cultural Asset Canvas Registry
          </h2>
          <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
            Himachal Pradesh is an extensive Western Himalayan cultural mosaic
            of Hindu, Buddhist, and indigenous traditions. This single-window
            command panel acts as a public ledger anchoring civic utility
            infrastructure inside regional identities—tracking peaks, passes,
            traditional clothing, and slow-cooked Dham cooking systems.
          </p>
        </div>
        <div className="w-40 h-20 shrink-0 bg-gradient-to-br from-[var(--pahadi-crimson)] via-[var(--kinnaur-marigold)] to-[var(--devdar-forest)] rounded-sm p-0.5 shadow-2xs">
          <div className="w-full h-full bg-white rounded-3xs flex flex-col items-center justify-center p-2 text-center text-[10px] font-mono font-black text-slate-700">
            <span>MOSAIC ECO REGISTRY</span>
            <span className="text-base mt-0.5">🏔️🧵🍲</span>
            <span className="text-[8px] text-slate-400 font-sans mt-0.5 font-normal">
              28 Pillars Active
            </span>
          </div>
        </div>
      </div>

      <div id="heritage-registry" className="mt-6 glass-panel p-4 grid gap-4 md:grid-cols-4 items-center">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            className="w-full rounded-xl border border-white/40 bg-white/70 pl-4 pr-10 py-2.5 text-xs text-slate-900 outline-none focus:border-[var(--him-pine)] shadow-[var(--glass-shadow)] backdrop-blur-sm placeholder:text-slate-400 font-semibold"
            placeholder="🔍 Query 28 cultural asset dimensions (ranges, items, passes, gems, dishes)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-black font-mono"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <select
            className="w-full rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[var(--him-pine)] backdrop-blur-sm"
            value={selectedDistrictFilter}
            onChange={(e) => setSelectedDistrictFilter(e.target.value)}
          >
            {uniqueDistricts.map((dist) => (
              <option key={dist} value={dist}>
                {dist === "All" ? "📍 Global State Matrix" : `🏔️ ${dist} Query`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <select
            className="w-full rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[var(--him-pine)] backdrop-blur-sm"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "✨ All Axis Dimensions" : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="himachali-weave-divider rounded-xs" />

      <IdentityMosaic
        assets={filteredAssets}
        onSelectAsset={(asset) => {
          setActiveDeckAsset(asset);
          setCarouselIndex(0);
        }}
      />

      {/* 🚀 HIGH-FIDELITY GLASSMORPHISM TINDER-STYLE CAROUSEL DECK MODAL */}
      {activeDeckAsset && activeDeckAsset.sub_items && (
        <SwipeModal
          activeDeckAsset={activeDeckAsset}
          setActiveDeckAsset={setActiveDeckAsset}
          carouselIndex={carouselIndex}
          setCarouselIndex={setCarouselIndex}
          handlePrevSlide={handlePrevSlide}
          handleNextSlide={handleNextSlide}
        />
      )}
    </div>
  );
}

function MemoryBridge() {
  const pillars = COMPREHENSIVE_HERITAGE_REGISTRY.length;
  const records = COMPREHENSIVE_HERITAGE_REGISTRY.reduce((sum, item) => sum + (item.subItems?.length || 0), 0);
  const collections = [
    ["01", "Geography & Sacred Sites", "Peaks, valleys, passes, rivers, hill stations and sacred geographies."],
    ["02", "Temples & Spirituality", "Temples, deities, pilgrimage routes, faith practices and sacred traditions."],
    ["03", "Art, Music & Performance", "Folk songs, dances, instruments, art forms and performance traditions."],
    ["04", "Crafts & Traditions", "Handicrafts, weaving, metalwork, woodwork and traditional making skills."],
    ["05", "Food, Agriculture & Livelihoods", "Pahari foods, dham, crops, orchards, animal husbandry and livelihoods."],
    ["06", "People, Culture & Identity", "Dialects, festivals, attire, social practices and cultural identities."],
  ];
  return <><FourLensIndex /><section id="memory-bridge" className="border border-t-0 border-[#d8cfbf] bg-[#f7f3ea] text-[#22251f]">
    <header className="grid gap-8 border-b border-[#d8cfbf] px-6 py-10 sm:px-10 lg:grid-cols-[1.2fr_1fr] lg:px-14 lg:py-12">
      <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#805d39]">The Archive</p><h2 className="mt-4 font-heading text-[clamp(2.35rem,3.45vw,3.65rem)] leading-[.96] tracking-[-.045em] lg:whitespace-nowrap">{pillars} cultural pillars <span className="text-[#9a8668]">·</span> {records} records</h2><i className="mt-5 block h-px w-16 bg-[#b78a4d]" /><p className="mt-5 max-w-xl text-base leading-6">An editorial archive connecting stories, traditions and knowledge from across Himachal. Explore by theme, discover by detail.</p><a className="mt-8 inline-flex border-b border-[#a77b40] pb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#704b25]" href="#heritage-registry">Explore the archive →</a></div>
      <div className="grid grid-cols-2 gap-6 border-l border-[#c7bba7] pl-7"><div><p className="font-heading text-4xl">{pillars}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.18em]">Cultural pillars</p><p className="mt-4 text-sm leading-5">Curated themes that define the cultural landscape of Himachal.</p></div><div><p className="font-heading text-4xl">{records}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.18em]">Records</p><p className="mt-4 text-sm leading-5">Detailed entries, practices, places and traditions preserved digitally.</p></div></div>
    </header>
    <div className="grid sm:grid-cols-2 lg:grid-cols-6">
      {collections.map(([number, title, detail]) => <article key={number} className="flex min-h-[30rem] flex-col border-b border-r border-[#d8cfbf] bg-[#f7f3ea] p-5 lg:min-h-[32.75rem]"><p className="text-[10px] font-bold tracking-[.18em] text-[#8b6537]">{number}</p><h3 className="mt-3 min-h-[4.2rem] font-heading text-[clamp(1.5rem,1.8vw,2rem)] leading-[.98] tracking-[-.035em]">{title}</h3><figure className="relative mt-4 h-44 overflow-hidden border border-[#cfc2ae] bg-[#655a4b]"><img src={dummyEvidence} alt="Placeholder collection imagery" className="h-full w-full object-cover grayscale sepia-[.18] saturate-[.72] contrast-[1.06] opacity-65" /></figure><p className="mt-4 text-[10px] font-bold uppercase tracking-[.14em] text-[#805d39]">{number === "01" ? "18" : number === "02" ? "16" : number === "03" ? "22" : number === "04" ? "20" : number === "05" ? "24" : "44"} records</p><p className="mt-3 min-h-[5rem] text-sm leading-5 text-[#514d44]">{detail}</p><a href="#heritage-registry" className="mt-auto inline-flex w-fit border-b border-transparent pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.16em] text-[#805d39] transition-colors duration-200 hover:border-[#a77b40]">View collection →</a></article>)}
    </div>
    <footer className="grid overflow-hidden border-t border-[#d8cfbf] bg-[#292820] text-[#f5ebda] sm:h-24 sm:grid-cols-[minmax(18rem,1.05fr)_minmax(0,1fr)]"><figure className="min-h-24 overflow-hidden border-b border-[#504b3d] bg-[#3b382f] sm:min-h-0 sm:border-b-0 sm:border-r"><img src={dummyEvidence} alt="Placeholder archive imagery" className="h-full w-full object-cover object-left grayscale sepia-[.45] saturate-[.7] opacity-[.24]" /></figure><div className="flex min-h-24 flex-col gap-4 px-6 py-5 sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><p className="border-l border-[#c89248] pl-5 text-sm leading-5">Every pillar. Every record.<br />One living memory of Himachal.</p><a className="border-b border-[#c89248] pb-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#e6bd76]" href="#heritage-registry">Browse all pillars →</a></div></footer>
  </section></>;
}

function FourLensIndex() {
  const lenses = [["01 / Place", "जगह", "Geography · Settlements · Sacred Sites", "Peaks · Valleys · Hill Stations · Temples · Architecture · Heritage"], ["02 / Land", "धरती", "Terrain · Water · Ecology", "Mountain Ranges · Glacial Lakes · Passes · Rivers · National Parks · Wildlife"], ["03 / Life", "जीवन", "Food · Agriculture · Identity", "Pahari Foods · Dham · Orchard Fruits · Cash Crops · Dialects · Traditional Dress"]];
  return <section className="border border-[#d8cfbf] bg-[#f7f3ea] text-[#22251f]"><div className="grid md:grid-cols-[1.18fr_repeat(3,minmax(0,.95fr))_1.12fr]">
    <header className="flex min-h-[18rem] flex-col justify-center border-b border-[#d8cfbf] px-[22%] py-10 sm:px-10 md:min-h-[15.5rem] md:border-b-0 md:border-r md:px-12"><p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#85653e]">The Memory of Himachal</p><h2 className="mt-4 font-heading text-[clamp(1.75rem,2.6vw,2rem)] font-semibold leading-[1.12] tracking-[-.045em]">चार नज़रिए।<br />एक विरासत।</h2><p className="mt-5 text-[13px] leading-5 text-[#736a5d]">Four lenses through which<br />Himachal is remembered.</p></header>
    {lenses.map(([number,title,meta,subjects])=><article key={number} className="flex min-h-[18rem] flex-col border-b border-[#d8cfbf] px-5 py-7 sm:px-6 md:min-h-[15.5rem] md:border-b-0 md:border-r md:px-4 md:py-5"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#896b42]">{number}</p><h3 className="mt-2 font-heading text-[clamp(1.65rem,2.7vw,2rem)] font-semibold leading-none tracking-[-.04em]">{title}</h3><img src={dummyEvidence} alt="Placeholder collection imagery" className="mt-3 h-32 w-full object-cover border border-[#cfc2ae] grayscale sepia-[.18] saturate-[.72] opacity-60 md:h-28"/><p className="mt-3 text-[8px] font-bold uppercase leading-3 tracking-[.13em] text-[#765c39]">{meta}</p><p className="mt-2 text-[10px] leading-4 text-[#665d50]">{subjects}</p></article>)}
    <article className="relative min-h-[18rem] overflow-hidden border-b border-[#d8cfbf] bg-[#292820] px-5 py-7 text-[#f4ead8] sm:px-6 md:min-h-[15.5rem] md:border-b-0 md:px-5 md:py-5"><img src={dummyEvidence} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center grayscale sepia-[.42] saturate-[.72] opacity-[.28]" /><div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(25,25,21,.48),rgba(25,25,21,.84))]" /><div className="relative"><p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#dcb976]">04 / Culture</p><h3 className="mt-3 font-heading text-[clamp(1.9rem,3.1vw,2.55rem)] font-semibold leading-none tracking-[-.04em]">संस्कृति</h3><p className="mt-3 text-[8px] font-bold uppercase leading-3 tracking-[.14em] text-[#dcb976]">Art · Music · Festivals · Tradition</p><p className="mt-4 font-heading text-[clamp(.9rem,1.25vw,1.12rem)] leading-[1.45]">नाटी · धाम · लोकगीत · हस्तशिल्प<br />मेले · देव परंपरा · कहानियाँ</p></div></article>
  </div></section>;
}

function LegacyMemoryBridgeV2() {
  const pillarCount = COMPREHENSIVE_HERITAGE_REGISTRY.length;
  const recordCount = COMPREHENSIVE_HERITAGE_REGISTRY.reduce((total, asset) => total + (asset.subItems?.length || 0), 0);
  const placeholderImages = { place: dummyEvidence, land: dummyEvidence, life: dummyEvidence };
  const collections = [
    ["01 / Place", "जगह", "Geography · Settlements · Sacred Sites", "Peaks · Valleys · Hill Stations · Temples · Architecture · Heritage", placeholderImages.place],
    ["02 / Land", "धरती", "Terrain · Water · Ecology", "Mountain Ranges · Glacial Lakes · Passes · Rivers · National Parks · Wildlife", placeholderImages.land],
    ["03 / Life", "जीवन", "Food · Agriculture · Identity", "Pahari Foods · Dham · Orchard Fruits · Cash Crops · Dialects · Traditional Dress", placeholderImages.life],
  ];

  return (
    <section id="memory-bridge" aria-labelledby="memory-bridge-title" className="overflow-hidden border border-[#d8cfbf] bg-[#f7f3ea] text-[#26231e]">
      <div className="grid lg:grid-cols-[1.18fr_repeat(3,minmax(0,0.95fr))_1.12fr]">
        <header className="flex min-h-[23rem] flex-col justify-center border-b border-[#d8cfbf] px-6 py-10 sm:px-10 lg:min-h-[24rem] lg:border-b-0 lg:border-r lg:px-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#85653e]">The Memory of Himachal</p>
          <h2 id="memory-bridge-title" className="mt-5 font-heading text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#24342a] sm:text-5xl">चार नज़रिए।<br />एक विरासत।</h2>
          <p className="mt-6 max-w-48 text-sm leading-6 text-[#736a5d]">Four lenses through which Himachal is remembered.</p>
        </header>

        {collections.map(([number, title, metadata, subjects, image]) => (
          <article className="group flex min-h-[23rem] flex-col border-b border-[#d8cfbf] px-5 py-7 sm:px-6 lg:min-h-[24rem] lg:border-b-0 lg:border-r" key={number}>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#896b42]">{number}</p>
            <h3 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.05em] text-[#24342a]">{title}</h3>
            <figure className="mt-4 h-36 overflow-hidden border border-[#bfb5a4] bg-[#565249]">
              <img alt={`Placeholder image for the ${number.split(" / ")[1]} collection`} className="h-full w-full object-cover grayscale sepia-[0.16] saturate-[0.5] opacity-75 transition duration-500 motion-reduce:transition-none group-hover:scale-[1.025] group-hover:opacity-85" src={image} />
            </figure>
            <p className="mt-4 text-[9px] font-bold uppercase leading-4 tracking-[0.14em] text-[#765c39]">{metadata}</p>
            <p className="mt-3 text-xs leading-5 text-[#665d50]">{subjects}</p>
          </article>
        ))}

        <article className="flex min-h-[23rem] flex-col border-b border-[#d8cfbf] bg-[#292820] px-5 py-7 text-[#f4ead8] sm:px-6 lg:min-h-[24rem] lg:border-b-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#dcb976]">04 / Culture</p>
            <h3 className="mt-4 font-heading text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">संस्कृति</h3>
          </div>
          <div className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#dcb976]">Art · Music · Festivals · Tradition</p>
            <div className="mt-5 grid grid-cols-3 gap-x-5 gap-y-4 border-y border-[#f4ead8]/20 py-5 font-heading text-[#f4ead8]">
              <span className="text-2xl">नाटी</span><span className="text-lg text-[#dcb976]">धाम</span><span className="text-2xl">लोकगीत</span>
              <span className="col-span-2 text-xl">हस्तशिल्प</span><span className="text-2xl text-[#dcb976]">मेले</span>
              <span className="col-span-2 text-xl text-[#dcb976]">देव परंपरा</span><span className="text-lg">कहानियाँ</span>
            </div>
            <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#dcb976]">Dance · Music · Craft · Fairs · Festivals · Regional Identity</p>
          </div>
        </article>
      </div>
      <footer className="flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-10 lg:px-14">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#85653e]">The Archive</p><p className="mt-2 font-heading text-2xl text-[#24342a]">{pillarCount} cultural pillars <span className="text-[#9a8668]">·</span> {recordCount} records</p><p className="mt-1 text-xs text-[#736a5d]">One living memory of Himachal.</p></div>
        <a className="inline-flex items-center gap-3 border-b border-[#85653e] pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4d422f] transition hover:border-[#24342a] hover:text-[#24342a]" href="#heritage-registry">Explore the archive <span aria-hidden="true">→</span></a>
      </footer>
    </section>
  );
}

function LegacyMemoryBridge() {
  const pillarCount = COMPREHENSIVE_HERITAGE_REGISTRY.length;
  const recordCount = COMPREHENSIVE_HERITAGE_REGISTRY.reduce(
    (total, asset) => total + (asset.subItems?.length || 0),
    0,
  );
  const placeholderImages = {
    place: dummyEvidence,
    land: dummyEvidence,
    life: dummyEvidence,
  };

  return (
    <section
      id="memory-bridge"
      aria-labelledby="memory-bridge-title"
      className="overflow-hidden border border-[#d8cfbf] bg-[#f7f3ea] text-[#26231e]"
    >
      <header className="px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12 lg:px-14 lg:pt-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#85653e] sm:text-[11px]">
          The Memory of Himachal
        </p>
        <h2
          id="memory-bridge-title"
          className="mt-4 font-heading text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#24342a] sm:text-5xl lg:text-6xl"
        >
          चार नज़रिए। एक विरासत।
        </h2>
        <p className="mt-3 max-w-xl text-xs font-normal leading-5 text-[#7d7468] sm:text-sm">
          A living archive of the places, lives and traditions that shape Himachal.
        </p>
      </header>

      <div className="grid border-y border-[#d8cfbf] lg:grid-cols-[minmax(0,1.32fr)_minmax(19rem,0.68fr)]">
        <article className="group relative min-h-[29rem] overflow-hidden border-b border-[#d8cfbf] bg-[#2a2924] sm:min-h-[34rem] lg:min-h-[39rem] lg:border-b-0 lg:border-r">
          <img
            alt="Placeholder image for the Place collection"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70 grayscale sepia-[0.12] saturate-[0.55] transition duration-700 motion-reduce:transition-none group-hover:scale-[1.025] group-hover:opacity-80"
            src={placeholderImages.place}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,24,20,0.10)_5%,rgba(24,24,20,0.28)_48%,rgba(21,20,17,0.86)_100%)]" />
          <div className="relative flex h-full flex-col justify-end p-6 pb-10 text-[#fff7e9] sm:p-10 sm:pb-12 lg:p-12 lg:pb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ead4a3]">01 / Place</p>
            <h3 className="mt-4 font-heading text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">जगह</h3>
            <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#ead4a3]/85">
              Geography · Settlements · Sacred Sites
            </p>
            <div className="mt-6 grid max-w-md grid-cols-2 border-y border-[#f1dfbb]/30 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#fff4dd] sm:text-[11px]">
              <span>Peaks</span><span>Valleys</span><span className="mt-2">Hill Stations</span><span className="mt-2">Temples</span><span className="mt-2">Architecture</span><span className="mt-2">Heritage</span>
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ead4a3]">View collection <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></p>
          </div>
        </article>

        <div className="grid min-h-[34rem] grid-rows-2">
        <article className="group grid min-h-0 grid-cols-[0.9fr_1.1fr] border-b border-[#d8cfbf] bg-[#eee7da]">
          <div className="order-2 flex flex-col justify-end p-5 sm:p-7 lg:p-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#896b42]">02 / Land</p>
            <h3 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.05em] text-[#24342a] sm:text-5xl">धरती</h3>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#896b42]">Terrain · Water · Ecology</p>
            <p className="mt-4 text-[10px] leading-5 text-[#625b4e] sm:text-[11px]">
              Mountain Ranges · Glacial Lakes · Passes · Rivers · National Parks · Wildlife
            </p>
          </div>
          <figure className="order-1 overflow-hidden bg-[#4b4941]">
            <img
              alt="Placeholder image for the Land collection"
              className="h-full w-full object-cover object-center opacity-65 grayscale sepia-[0.12] saturate-[0.55] transition duration-700 motion-reduce:transition-none group-hover:scale-[1.03] group-hover:opacity-75"
              src={placeholderImages.land}
            />
          </figure>
        </article>

        <article className="group grid min-h-0 grid-cols-[0.9fr_1.1fr] bg-[#f7f3ea]">
          <figure className="overflow-hidden bg-[#4b4941]">
            <img
              alt="Placeholder image for the Life collection"
              className="h-full w-full object-cover object-center opacity-65 grayscale sepia-[0.12] saturate-[0.55] transition duration-700 motion-reduce:transition-none group-hover:scale-[1.03] group-hover:opacity-75"
              src={placeholderImages.life}
            />
          </figure>
          <div className="flex flex-col justify-end p-5 sm:p-7 lg:p-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#896b42]">03 / Life</p>
            <h3 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.05em] text-[#24342a] sm:text-5xl">जीवन</h3>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#896b42]">Food · Agriculture · Identity</p>
            <p className="mt-4 text-[10px] leading-5 text-[#625b4e] sm:text-[11px]">
              Pahari Foods · Dham · Orchard Fruits · Cash Crops · Dialects · Traditional Dress
            </p>
          </div>
        </article>
        </div>

        <article className="col-span-full grid gap-6 bg-[#282721] px-6 py-9 text-[#f7efdf] sm:px-10 sm:py-11 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:gap-12 lg:px-14 lg:py-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ddbf7e]">04 / Culture</p>
            <h3 className="mt-4 font-heading text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">संस्कृति</h3>
          </div>
          <div className="grid grid-cols-[1fr_auto_1.15fr] items-baseline gap-x-5 gap-y-3 border-y border-[#f3e7d1]/20 py-5 font-heading leading-none text-[#f3e7d1] sm:gap-x-8">
            <span className="text-2xl sm:text-3xl">नाटी</span>
            <span className="text-lg text-[#ddbf7e] sm:text-xl">धाम</span>
            <span className="text-2xl sm:text-3xl">लोकगीत</span>
            <span className="col-span-2 text-lg text-[#ddbf7e] sm:text-xl">हस्तशिल्प</span>
            <span className="text-2xl sm:text-3xl">मेले</span>
            <span className="col-span-2 text-xl sm:text-2xl">देव परंपरा</span>
            <span className="text-lg text-[#ddbf7e] sm:text-xl">कहानियाँ</span>
          </div>
          <p className="col-span-full text-[9px] font-bold uppercase tracking-[0.18em] text-[#ddbf7e]">Art · Music · Festivals · Tradition</p>
          <p className="col-span-full border-t border-[#f3e7d1]/20 pt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-[#ddbf7e]">Dance · Music · Craft · Fairs · Festivals · Regional Identity</p>
        </article>
      </div>

      <footer className="flex flex-col gap-5 px-6 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:py-10 lg:px-14">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#85653e]">The Archive</p>
          <p className="mt-2 font-heading text-xl text-[#24342a] sm:text-2xl">
            {pillarCount} cultural pillars <span className="text-[#9a8668]">·</span> {recordCount} records
          </p>
          <p className="mt-1 text-xs text-[#6e6557]">One living memory of Himachal.</p>
        </div>
        <div>
          <a
            className="inline-flex items-center gap-3 border-b border-[#85653e] pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4d422f] transition hover:border-[#24342a] hover:text-[#24342a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#24342a]"
            href="#heritage-registry"
          >
            Explore the archive <span aria-hidden="true" className="text-base leading-none">→</span>
          </a>
        </div>
      </footer>
    </section>
  );
}

function SwipeModal({
  activeDeckAsset,
  setActiveDeckAsset,
  carouselIndex,
  setCarouselIndex,
  handlePrevSlide,
  handleNextSlide,
}) {
  const [dragStartX, setDragStartX] = useState(null);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const totalItems = activeDeckAsset.sub_items.length;
  const nextIndex = (carouselIndex + 1) % totalItems;
  const prevIndex = (carouselIndex - 1 + totalItems) % totalItems;

  const swipeThreshold = 140;
  const currentOffsetX = isDragging ? dragCurrentX - dragStartX : 0;
  const swipeProgress = Math.min(Math.abs(currentOffsetX) / swipeThreshold, 1);

  const isLeftSwipeActive = currentOffsetX < -15;
  const isRightSwipeActive = currentOffsetX > 15;

  const handleDragStart = (clientX) => {
    setDragStartX(clientX);
    setIsDragging(true);
  };

  const handleDragMove = (clientX) => {
    if (!isDragging) return;
    setDragCurrentX(clientX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (currentOffsetX > swipeThreshold) {
      handlePrevSlide();
    } else if (currentOffsetX < -swipeThreshold) {
      handleNextSlide();
    }

    setDragStartX(null);
    setDragCurrentX(0);
  };

  const mainCardTransformStyle = {
    transform: `translateX(${currentOffsetX}px) rotate(${currentOffsetX * 0.05}deg)`,
    transition: isDragging
      ? "none"
      : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <section className="w-full max-w-xl rounded-xl border border-white/40 bg-white/70 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between gap-4 bg-white/30 border-b border-white/20 p-4">
          <div className="min-w-0">
            <span className="text-[9px] font-black tracking-widest text-[var(--kinnaur-marigold)] uppercase bg-amber-100/60 px-2 py-0.5 rounded-xs">
              {activeDeckAsset.pillar_category}
            </span>
            <h4 className="text-xs font-black uppercase text-[var(--devdar-forest)] truncate mt-1 tracking-tight">
              {activeDeckAsset.title}
            </h4>
          </div>
          <button
            onClick={() => setActiveDeckAsset(null)}
            className="h-7 w-7 rounded-md border border-white/40 bg-white/50 text-slate-500 flex items-center justify-center transition hover:text-slate-800 hover:bg-white/80 shadow-2xs text-xs font-black font-mono"
          >
            ✕
          </button>
        </div>

        <div className="himachali-weave-divider opacity-40" />

        <div className="p-6 space-y-5">
          {/* 🪐 IMAGE GESTURE LAYER */}
          <div
            className="w-full h-52 relative select-none touch-none rounded-lg"
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
          >
            {isLeftSwipeActive && (
              <div
                className="absolute inset-0 rounded-lg border border-white/20 bg-white/40 pointer-events-none flex flex-col items-center justify-center p-4 text-center scale-95 transition-opacity"
                style={{ opacity: swipeProgress * 0.7 }}
              >
                <span className="text-3xl opacity-40 filter blur-xs">
                  {activeDeckAsset.sub_items[nextIndex].icon ||
                    activeDeckAsset.icon}
                </span>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 mt-2">
                  Incoming Vector
                </span>
                <h5 className="text-xs font-bold text-slate-500 line-clamp-1">
                  {activeDeckAsset.sub_items[nextIndex].name}
                </h5>
              </div>
            )}

            {isRightSwipeActive && (
              <div
                className="absolute inset-0 rounded-lg border border-white/20 bg-white/40 pointer-events-none flex flex-col items-center justify-center p-4 text-center scale-95 transition-opacity"
                style={{ opacity: swipeProgress * 0.7 }}
              >
                <span className="text-3xl opacity-40 filter blur-xs">
                  {activeDeckAsset.sub_items[prevIndex].icon ||
                    activeDeckAsset.icon}
                </span>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 mt-2">
                  Previous Vector
                </span>
                <h5 className="text-xs font-bold text-slate-500 line-clamp-1">
                  {activeDeckAsset.sub_items[prevIndex].name}
                </h5>
              </div>
            )}

            <div
              style={mainCardTransformStyle}
              className="absolute inset-0 bg-white/95 border border-white/50 shadow-md rounded-lg flex flex-col items-center justify-center p-4 text-center overflow-hidden"
            >
              {activeDeckAsset.sub_items[carouselIndex].img ? (
                <img
                  src={activeDeckAsset.sub_items[carouselIndex].img}
                  alt={activeDeckAsset.sub_items[carouselIndex].name}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              ) : (
                <div className="text-slate-500 space-y-1 pointer-events-none select-none">
                  <span className="text-4xl filter drop-shadow-md block animate-pulse">
                    {activeDeckAsset.sub_items[carouselIndex].icon ||
                      activeDeckAsset.icon}
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider block text-slate-600">
                    Image Asset Layer Active
                  </span>
                  <p className="text-[9px] font-sans text-slate-500 max-w-[260px] mx-auto leading-normal">
                    Technical anchor setup allocated for{" "}
                    {activeDeckAsset.sub_items[carouselIndex].name} asset file
                    injections.
                  </p>
                </div>
              )}

              <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-md font-mono text-[9px] font-bold tabular-nums border border-white/10 shadow-sm">
                {carouselIndex + 1} / {totalItems}
              </div>
            </div>
          </div>

          <div className="space-y-2 min-h-[95px] px-0.5 pointer-events-none select-none">
            <h3 className="text-sm font-black text-[var(--devdar-forest)] uppercase tracking-tight flex items-center gap-2">
              <span className="text-xl">
                {activeDeckAsset.sub_items[carouselIndex].icon}
              </span>
              {activeDeckAsset.sub_items[carouselIndex].name}
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {activeDeckAsset.sub_items[carouselIndex].detail}
            </p>
          </div>

          <div className="p-3 bg-white/50 border border-white/40 rounded-lg shadow-3xs pointer-events-none select-none">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block font-sans">
              Identity Attribute Vector Vector
            </span>
            <p className="text-[10px] font-bold text-slate-800 mt-0.5 font-mono leading-tight text-left break-words">
              {activeDeckAsset.sub_items[carouselIndex].spec}
            </p>
          </div>
        </div>

        <div className="bg-white/40 border-t border-white/20 p-4 flex items-center justify-between">
          <button
            onClick={handlePrevSlide}
            className={cx(
              "px-3 py-1.5 rounded-md border text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-2xs active:scale-98",
              isRightSwipeActive
                ? "bg-amber-500 border-amber-400 text-white ring-4 ring-amber-500/20 scale-105 shadow-md"
                : "border-white/40 bg-white/60 text-slate-700 hover:bg-white/80",
            )}
          >
            ← Prev Vector
          </button>

          <div className="flex gap-1.5 items-center">
            {activeDeckAsset.sub_items.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setCarouselIndex(dotIdx)}
                className={`h-2 rounded-full transition-all duration-300 ${dotIdx === carouselIndex ? "bg-[var(--pahadi-crimson)] w-5 shadow-3xs" : "bg-slate-300 hover:bg-slate-400 w-2"}`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNextSlide}
            className={cx(
              "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-2xs active:scale-98",
              isLeftSwipeActive
                ? "bg-emerald-600 text-white ring-4 ring-emerald-600/20 scale-105 shadow-md"
                : "bg-[var(--devdar-forest)] text-white hover:bg-[#132B1F]",
            )}
          >
            Next Slide →
          </button>
        </div>
      </section>
    </div>
  );
}

function GrievanceFeedCard({ ticket, onUpvote, onViewDetails }) {
  const effectivePriority = getEffectivePriority(ticket);
  const isCluster = ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD;

  const localPriorityStyles = {
    critical:
      "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
    high: "border-[var(--kinnaur-marigold)] bg-amber-50/60 text-amber-950",
    medium: "border-[var(--dry-wool)] bg-slate-50 text-slate-800",
    low: "border-slate-200 bg-slate-100 text-slate-600",
  };

  const localStatusStyles = {
    Pending: "border-[var(--dry-wool)] bg-white text-slate-800",
    "Under Verification": "border-sky-300 bg-sky-50 text-sky-900",
    "Verified Resolved": "border-emerald-300 bg-emerald-50 text-emerald-900",
    "Reopened via Citizen Veto":
      "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex gap-4">
        <div className="h-40 w-60 shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <img
            src={dummyEvidence}
            alt="Evidence"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-[var(--devdar-forest)] leading-snug">
              {ticket.title}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              📍 {ticket.district} / {ticket.block} / {ticket.panchayat}
            </p>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {ticket.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span
                className={cx(
                  "inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-xs",
                  localPriorityStyles[effectivePriority],
                )}
              >
                {priorityLabel[effectivePriority]}
              </span>

              <span
                className={cx(
                  "inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-xs",
                  localStatusStyles[ticket.status],
                )}
              >
                {ticket.status}
              </span>

              {isCluster && (
                <span className="border border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)] text-[9px] uppercase tracking-wider rounded-xs py-0.5 px-2 font-bold animate-pulse">
                  💥 High Threat Emergency
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] px-3 text-xs font-bold font-mono text-[var(--devdar-forest)] transition hover:bg-slate-100"
              onClick={() => onUpvote(ticket.id)}
              type="button"
            >
              <ThumbsUp className="h-3.5 w-3.5 text-[var(--pahadi-crimson)]" />
              {ticket.upvotes}
            </button>

            <button
              className="inline-flex h-8 items-center justify-center rounded-sm border border-slate-300 bg-white px-3 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
              onClick={() => onViewDetails(ticket)}
              type="button"
            >
              View Details
            </button>

            <button
              className="inline-flex h-8 items-center justify-center rounded-sm border border-slate-300 bg-white px-3 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
              type="button"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ResolutionModal({ ticket, onClose, onResolve, onVeto }) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [validationImageUrl, setValidationImageUrl] = useState("");
  const [vetoRemarks, setVetoRemarks] = useState("");
  const [error, setError] = useState("");

  const isVeto = ticket.action === "veto";

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isVeto) {
      if (!vetoRemarks.trim()) {
        setError("Veto remarks are required.");
        return;
      }
      onVeto(vetoRemarks);
    } else {
      if (!resolutionNotes.trim() || !validationImageUrl.trim()) {
        setError("Resolution notes and validation image are mandatory.");
        return;
      }
      onResolve(resolutionNotes, validationImageUrl);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-2xs animate-in fade-in">
      <section className="w-full max-w-2xl rounded-sm border border-[var(--dry-wool)] bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--dry-wool)] bg-[#F5F7FA] p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {isVeto
                ? "Citizen Counter-Verification"
                : "Administrative Closing Ledger"}
            </p>
            <h2 className="mt-1 break-all text-sm font-mono font-black text-slate-900">
              📁 Ticket Ref: {ticket.id}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-600 line-clamp-1">
              {ticket.title}
            </p>
          </div>
          <button
            aria-label="Close modal"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[var(--dry-wool)] bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 shadow-2xs"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
          </button>
        </div>

        <div className="himachali-weave-divider" />

        <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
          {isVeto ? (
            <>
              <Field label="Why should this work closure be blocked? (Citizen Veto Remarks)">
                <textarea
                  className={cx(inputClass, "min-h-32 resize-none")}
                  placeholder="Provide explicit ground evidence demonstrating that the reported public works repair is incomplete or sub-standard..."
                  value={vetoRemarks}
                  onChange={(event) => setVetoRemarks(event.target.value)}
                />
              </Field>
              {error && <InlineError message={error} />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t border-slate-100">
                <button
                  className="h-9 rounded-sm border border-[var(--dry-wool)] bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                  onClick={onClose}
                  type="button"
                >
                  Dismiss
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm bg-[var(--pahadi-crimson)] px-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#801422] disabled:opacity-40 shadow-xs"
                  disabled={!vetoRemarks.trim()}
                  type="submit"
                >
                  <Flame className="h-4 w-4" />
                  File Executive Veto
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="Field Engineering Actions / Resolution Notes">
                <textarea
                  className={cx(inputClass, "min-h-32 resize-none")}
                  placeholder="Detail exactly what structural patches, drainage clearouts, or engineering measures were completed on-site to secure this asset..."
                  value={resolutionNotes}
                  onChange={(event) => setResolutionNotes(event.target.value)}
                />
              </Field>

              <Field label="Validation Image URL / Field Evidence Photo">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="https://images.example.gov.in/hp/monsoon-evidence-clear.jpg"
                    value={validationImageUrl}
                    onChange={(event) =>
                      validationImageUrl &&
                      setValidationImageUrl(event.target.value)
                    }
                  />
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] text-slate-500 shadow-2xs">
                    <ImagePlus
                      className="h-4 w-4 text-[var(--devdar-forest)]"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Field>

              {error && <InlineError message={error} />}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t border-slate-100">
                <button
                  className="h-9 rounded-sm border border-[var(--dry-wool)] bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm bg-[var(--devdar-forest)] px-4 text-xs font-bold uppercase tracking-wider text-[#F5F7FA] transition hover:bg-[#132B1F] disabled:opacity-50 shadow-2xs"
                  disabled={
                    !resolutionNotes.trim() || !validationImageUrl.trim()
                  }
                  type="submit"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Confirm Field Resolution
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

function PanelHeader({ eyebrow, icon: Icon, title }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-black text-[var(--devdar-forest)] uppercase tracking-tight">
          {title}
        </h2>
      </div>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] text-[var(--devdar-forest)] shadow-2xs">
        <Icon className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, surface, tone }) {
  return (
    <article
      className={cx(
        "rounded-sm border p-4 shadow-2xs flex flex-col justify-between",
        surface,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 leading-tight">
          {label}
        </p>
        <Icon
          className={cx("h-4 w-4 shrink-0 mt-0.5", tone)}
          aria-hidden="true"
        />
      </div>
      <p
        className={cx("mt-4 text-2xl font-black font-mono tabular-nums", tone)}
      >
        {Number(value || 0).toLocaleString("en-IN")}
      </p>
    </article>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-3 shadow-2xs">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 break-words text-xs font-bold text-[var(--devdar-forest)]">
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-xs">
      <span className="font-bold text-slate-700 uppercase tracking-tight text-[11px]">
        {label}
      </span>
      {children}
    </label>
  );
}

function InlineError({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
      <XCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pahadi-crimson)]"
        aria-hidden="true"
      />
      <span className="font-medium">{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div className="mt-5 grid min-h-36 place-items-center rounded-sm border border-dashed border-[var(--dry-wool)] bg-[#F5F7FA] p-5 text-center">
      <div>
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-sm border border-[var(--dry-wool)] bg-white text-slate-400 shadow-2xs">
          <Icon
            className="h-4 w-4 text-[var(--devdar-forest)]"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 max-w-xs mx-auto">
          {detail}
        </p>
      </div>
    </div>
  );
}

function calculateCompositeScore(ticket) {
  const priority = getEffectivePriority(ticket);
  return (
    (priority === "critical" ? 60 : 20) +
    ticket.upvotes * 2 +
    (ticket.terrainRisk === FLASH_FLOOD_RISK ? 15 : 0)
  );
}

function getEffectivePriority(ticket) {
  return ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD
    ? "critical"
    : ticket.priority;
}

function derivePriorityFromTerrain(terrainRisk) {
  if (terrainRisk === FLASH_FLOOD_RISK) {
    return "critical";
  }

  if (
    terrainRisk === "Landslide Vulnerable Link" ||
    terrainRisk === "High-Alpine Alpine Track"
  ) {
    return "high";
  }

  return "medium";
}

function priorityToSlaHours(priority) {
  if (priority === "critical") {
    return 8;
  }

  if (priority === "high") {
    return 24;
  }

  return 72;
}

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isSlaBreached(ticket, nowMs) {
  return (
    ticket.status !== "Verified Resolved" &&
    new Date(ticket.slaDueAt).getTime() < nowMs
  );
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export default App;
