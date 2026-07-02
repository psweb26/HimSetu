import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronRight,
  MapPin,
  Search,
  Building2,
  AlertCircle,
  Flame,
  Clock,
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
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getPriorityBorderColor(priority) {
  const colors = {
    critical: "border-l-[var(--pahadi-crimson)]",
    high: "border-l-[var(--kinnaur-marigold)]",
    medium: "border-l-blue-400",
    low: "border-l-emerald-400",
  };
  return colors[priority] || colors.medium;
}

function getPriorityIcon(priority) {
  const icons = {
    critical: Flame,
    high: AlertCircle,
    medium: Clock,
    low: Clock,
  };
  return icons[priority] || Clock;
}

function getStatusClass(status) {
  const styles = {
    Pending: "bg-amber-100 text-amber-800 border-amber-200",
    "Under Verification": "bg-sky-100 text-sky-800 border-sky-200",
    "Verified Resolved": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Reopened via Citizen Veto": "bg-[var(--pahadi-crimson)]/10 text-[var(--pahadi-crimson)] border-[var(--pahadi-crimson)]/30",
  };

  return styles[status] || "bg-slate-100 text-slate-700 border-slate-200";
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
    "h-9 rounded-sm border border-[var(--him-stone)] bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10";

  const activeFilters = [
    statusFilter !== ALL_FILTER && `Status: ${statusFilter}`,
    priorityFilter !== ALL_FILTER && `Priority: ${priorityLabels[priorityFilter]}`,
    districtFilter !== ALL_FILTER && `District: ${districtFilter}`,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* GIS-STYLE TOOLBAR */}
      <div className="kathkuni-card bg-white p-4 space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)] mb-2">
            GIS Operations Toolbar
          </p>
          <h3 className="text-sm font-black text-[var(--devdar-forest)] uppercase tracking-tight">
            District Operations Queue
          </h3>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_120px_120px_120px_120px]">
          <label className="relative block">
            <span className="sr-only">Search incidents</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              className={cx(controlClass, "w-full pl-9")}
              placeholder="🔍 Search by ID, title, location"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <select
            className={cx(controlClass, "w-full")}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            title="Filter by incident status"
          >
            <option value={ALL_FILTER}>All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className={cx(controlClass, "w-full")}
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            title="Filter by priority"
          >
            <option value={ALL_FILTER}>All Priority</option>
            {Object.keys(priorityRank).map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority] || toTitleCase(priority)}
              </option>
            ))}
          </select>

          <select
            className={cx(controlClass, "w-full")}
            value={districtFilter}
            onChange={(event) => setDistrictFilter(event.target.value)}
            title="Filter by district"
          >
            <option value={ALL_FILTER}>All Districts</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>

          <select
            className={cx(controlClass, "w-full")}
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            title="Sort incidents"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* TOOLBAR INFO */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--him-stone)] pt-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{filteredTickets.length} Incident{filteredTickets.length !== 1 ? 's' : ''}</span>
            {districtFilter !== ALL_FILTER && (
              <span className="text-[var(--devdar-forest)]">• {districtFilter}</span>
            )}
          </div>
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
              <span>Active:</span>
              <span className="text-[var(--kinnaur-marigold)]">{activeFilters.join(" • ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* INCIDENT ROWS */}
      <div className="space-y-2">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => {
            const effectivePriority = getEffectivePriority(
              ticket,
              criticalThreshold,
            );
            const isSelected = selectedTicketId === ticket.id;
            const PriorityIcon = getPriorityIcon(effectivePriority);

            return (
              <article
                key={ticket.id}
                aria-current={isSelected ? "true" : undefined}
                className={cx(
                  "group rounded-sm border-l-4 border-r border-t border-b transition-all duration-200 cursor-pointer",
                  getPriorityBorderColor(effectivePriority),
                  "hover:shadow-xs hover:-translate-y-0.5",
                  isSelected
                    ? "border-[var(--him-stone)] bg-[var(--devdar-forest)]/5 ring-1 ring-[var(--devdar-forest)]/20"
                    : "border-[var(--him-stone)] bg-white hover:border-[var(--devdar-forest)]/50",
                )}
                role="button"
                tabIndex={0}
                onClick={() => onSelectIncident(ticket)}
                onKeyDown={(event) => handleRowKeyDown(event, ticket)}
              >
                <div className="flex items-center justify-between gap-3 p-3">
                  {/* LEFT: Priority Icon + ID + Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB]">
                      <PriorityIcon className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-black text-[var(--devdar-forest)] shrink-0">
                          {ticket.id}
                        </span>
                        <span className="truncate text-xs font-bold text-slate-900">
                          {ticket.title}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">
                        {ticket.block} / {ticket.panchayat}
                      </span>
                    </div>
                  </div>

                  {/* CENTER: District + Status + Department */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[var(--devdar-forest)]" aria-hidden="true" />
                      <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                        {ticket.district}
                      </span>
                    </div>

                    <span className={cx(
                      "inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide whitespace-nowrap",
                      getStatusClass(ticket.status),
                    )}>
                      {ticket.status === "Verified Resolved" ? "Resolved" : ticket.status}
                    </span>

                    {ticket.department && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                        <span className="text-[9px] font-semibold text-sky-700 whitespace-nowrap max-w-[100px] truncate">
                          {ticket.department}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Upvotes + Time + Control Room */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-[var(--him-stone)] bg-[#F8FAFB] px-2 text-[9px] font-black text-slate-700 transition hover:border-[var(--pahadi-crimson)] hover:bg-rose-50 hover:text-[var(--pahadi-crimson)]"
                      type="button"
                      title="Upvote this incident"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpvote?.(ticket.id);
                      }}
                    >
                      <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                      <span className="font-bold">{ticket.upvotes}</span>
                    </button>

                    <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap w-10 text-right">
                      {formatRelativeTime(ticket.createdAt, nowMs)}
                    </span>

                    <button
                      className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-[var(--devdar-forest)]/30 bg-white px-2 text-[9px] font-black uppercase tracking-wider text-[var(--devdar-forest)] transition hover:border-[var(--devdar-forest)] hover:bg-[var(--devdar-forest)]/5 group-hover:border-[var(--devdar-forest)]"
                      type="button"
                      title="Open control room for this incident"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenWorkspace(ticket);
                      }}
                    >
                      Control
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-sm border border-dashed border-[var(--him-stone)] bg-[#F8FAFB] p-6 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No incidents match the current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
