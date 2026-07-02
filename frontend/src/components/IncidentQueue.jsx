import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  ThumbsUp,
} from "lucide-react";

const ALL_FILTER = "all";

const defaultPriorityLabels = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityRank = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const sortOptions = [
  { label: "Most Upvoted", value: "upvotes" },
  { label: "Latest", value: "latest" },
  { label: "Highest Priority", value: "priority" },
];

const cx = (...classes) => classes.filter(Boolean).join(" ");

function normalize(value) {
  return String(value || "").toLowerCase();
}

function toTitleCase(value) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getEffectivePriority(ticket, criticalThreshold) {
  return ticket.upvotes > criticalThreshold ? "critical" : ticket.priority;
}

function formatRelativeTime(value, nowMs) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Unknown";
  }

  const diffMinutes = Math.max(0, Math.floor((nowMs - timestamp) / 60_000));
  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getStatusClass(status) {
  const styles = {
    Pending: "border-amber-200 bg-amber-50 text-amber-900",
    "Under Verification": "border-sky-200 bg-sky-50 text-sky-900",
    "Verified Resolved": "border-emerald-200 bg-emerald-50 text-emerald-900",
    "Reopened via Citizen Veto":
      "border-[var(--pahadi-crimson)]/30 bg-rose-50 text-[var(--pahadi-crimson)]",
  };

  return styles[status] || "border-slate-200 bg-slate-50 text-slate-700";
}

function getPriorityClass(priority) {
  const styles = {
    critical:
      "border-[var(--pahadi-crimson)]/35 bg-rose-50 text-[var(--pahadi-crimson)]",
    high: "border-[var(--kinnaur-marigold)]/45 bg-amber-50 text-amber-950",
    medium: "border-slate-200 bg-slate-50 text-slate-800",
    low: "border-slate-200 bg-white text-slate-600",
  };

  return styles[priority] || styles.medium;
}

function getUniqueOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export default function IncidentQueue({
  tickets,
  selectedTicketId,
  onSelectIncident,
  onOpenWorkspace,
  onUpvote,
  nowMs,
  districts = [],
  criticalThreshold = 30,
  priorityLabels = defaultPriorityLabels,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = useState(ALL_FILTER);
  const [districtFilter, setDistrictFilter] = useState(ALL_FILTER);
  const [sortBy, setSortBy] = useState("upvotes");

  const statusOptions = useMemo(
    () => getUniqueOptions(tickets.map((ticket) => ticket.status)),
    [tickets],
  );

  const districtOptions = useMemo(() => {
    const configuredDistricts = districts.map((entry) => entry.district);
    const ticketDistricts = tickets.map((ticket) => ticket.district);
    return getUniqueOptions([...configuredDistricts, ...ticketDistricts]);
  }, [districts, tickets]);

  const filteredTickets = useMemo(() => {
    const query = normalize(searchQuery.trim());

    return tickets
      .filter((ticket) => {
        const effectivePriority = getEffectivePriority(
          ticket,
          criticalThreshold,
        );
        const searchText = [
          ticket.id,
          ticket.title,
          ticket.district,
          ticket.block,
          ticket.panchayat,
          ticket.status,
          priorityLabels[effectivePriority],
        ]
          .map(normalize)
          .join(" ");

        const matchesSearch = !query || searchText.includes(query);
        const matchesStatus =
          statusFilter === ALL_FILTER || ticket.status === statusFilter;
        const matchesPriority =
          priorityFilter === ALL_FILTER || effectivePriority === priorityFilter;
        const matchesDistrict =
          districtFilter === ALL_FILTER || ticket.district === districtFilter;

        return (
          matchesSearch && matchesStatus && matchesPriority && matchesDistrict
        );
      })
      .sort((left, right) => {
        if (sortBy === "latest") {
          return (
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
          );
        }

        if (sortBy === "priority") {
          const priorityDelta =
            (priorityRank[getEffectivePriority(right, criticalThreshold)] ||
              0) -
            (priorityRank[getEffectivePriority(left, criticalThreshold)] || 0);

          if (priorityDelta !== 0) {
            return priorityDelta;
          }
        }

        const upvoteDelta = right.upvotes - left.upvotes;
        if (upvoteDelta !== 0) {
          return upvoteDelta;
        }

        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
      });
  }, [
    tickets,
    searchQuery,
    statusFilter,
    priorityFilter,
    districtFilter,
    sortBy,
    criticalThreshold,
    priorityLabels,
  ]);

  function handleRowKeyDown(event, ticket) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectIncident(ticket);
    }
  }

  const controlClass =
    "h-9 rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10";

  return (
    <div className="mt-5">
      <div className="rounded-sm border border-slate-200 bg-[#F8FAFC] p-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(150px,auto))]">
          <label className="relative block">
            <span className="sr-only">Search incidents</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              className={cx(controlClass, "w-full pl-9")}
              placeholder="Search incidents"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="sr-only">Status filter</span>
            <select
              className={cx(controlClass, "w-full")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value={ALL_FILTER}>All status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Priority filter</span>
            <select
              className={cx(controlClass, "w-full")}
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value={ALL_FILTER}>All priority</option>
              {Object.keys(priorityRank).map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority] || toTitleCase(priority)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">District filter</span>
            <select
              className={cx(controlClass, "w-full")}
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
            >
              <option value={ALL_FILTER}>All districts</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Sort incidents</span>
            <select
              className={cx(controlClass, "w-full")}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Civic operations queue
          </span>
          <span>{filteredTickets.length} incidents</span>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[1060px]">
          <div className="grid grid-cols-[96px_minmax(260px,1fr)_112px_132px_100px_80px_82px_132px] gap-2 border-y border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>Incident ID</span>
            <span>Title</span>
            <span>District</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Upvotes</span>
            <span className="inline-flex items-center gap-1">
              Created
              <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
            </span>
            <span>Workspace</span>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const effectivePriority = getEffectivePriority(
                  ticket,
                  criticalThreshold,
                );
                const isSelected = selectedTicketId === ticket.id;

                return (
                  <article
                    key={ticket.id}
                    aria-current={isSelected ? "true" : undefined}
                    className={cx(
                      "grid grid-cols-[96px_minmax(260px,1fr)_112px_132px_100px_80px_82px_132px] items-center gap-2 border-b px-3 py-2 text-left transition-all duration-200",
                      "cursor-pointer focus-within:bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white",
                      isSelected
                        ? "border-[var(--devdar-forest)] bg-emerald-50/45 ring-1 ring-[var(--devdar-forest)]/20"
                        : "border-slate-200 bg-white",
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectIncident(ticket)}
                    onKeyDown={(event) => handleRowKeyDown(event, ticket)}
                  >
                    <span className="truncate font-mono text-[11px] font-black text-[var(--devdar-forest)]">
                      {ticket.id}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold leading-5 text-slate-900">
                        {ticket.title}
                      </span>
                      <span className="block truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {ticket.block} / {ticket.panchayat}
                      </span>
                    </span>

                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-700">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0 text-[var(--devdar-forest)]"
                        aria-hidden="true"
                      />
                      <span className="truncate">{ticket.district}</span>
                    </span>

                    <span
                      className={cx(
                        "inline-flex w-fit max-w-full items-center rounded-sm border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                        getStatusClass(ticket.status),
                      )}
                    >
                      <span className="truncate">{ticket.status}</span>
                    </span>

                    <span
                      className={cx(
                        "inline-flex w-fit items-center rounded-sm border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                        getPriorityClass(effectivePriority),
                      )}
                    >
                      {priorityLabels[effectivePriority] ||
                        toTitleCase(effectivePriority)}
                    </span>

                    <button
                      className="inline-flex h-8 w-fit items-center gap-1.5 rounded-sm border border-slate-200 bg-[#F8FAFC] px-2 text-xs font-black text-slate-800 transition hover:border-[var(--pahadi-crimson)]/30 hover:bg-rose-50"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpvote?.(ticket.id);
                      }}
                    >
                      <ThumbsUp
                        className="h-3.5 w-3.5 text-[var(--pahadi-crimson)]"
                        aria-hidden="true"
                      />
                      {ticket.upvotes}
                    </button>

                    <span className="text-xs font-semibold text-slate-500">
                      {formatRelativeTime(ticket.createdAt, nowMs)}
                    </span>

                    <button
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-[var(--devdar-forest)]/25 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-[var(--devdar-forest)] transition hover:bg-[var(--devdar-forest)] hover:text-white"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenWorkspace(ticket);
                      }}
                    >
                      Open Workspace
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="border-b border-slate-200 bg-white px-3 py-8 text-center text-xs font-semibold text-slate-500">
                No incidents match the current queue filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
