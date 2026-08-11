import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Flame,
  ImagePlus,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ThumbsUp,
  X,
} from "lucide-react";

const ALL_FILTER = "all";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const UNAUTHENTICATED_COMMENTER = "Community Member";

const defaultPriorityLabels = {
  critical: "Critical Threat",
  high: "High Threat",
  medium: "Medium",
  low: "Low",
};

const priorityRank = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

function normalize(value) {
  return String(value || "").toLowerCase();
}

function normalizeMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getEffectivePriority(ticket, criticalThreshold) {
  return ticket.upvotes > criticalThreshold ? "critical" : ticket.priority;
}

function formatRelativeTime(value, nowMs) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";

  const diffMinutes = Math.max(0, Math.floor((nowMs - timestamp) / 60_000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

function getSlaLabel(ticket, nowMs) {
  const due = new Date(ticket.slaDueAt).getTime();
  if (!Number.isFinite(due)) return "SLA pending";
  const remainingMs = due - nowMs;
  if (remainingMs <= 0) return "SLA breached";

  const hours = Math.max(1, Math.ceil(remainingMs / 3_600_000));
  if (hours < 24) return `SLA: ${hours}h remaining`;
  return `SLA: ${Math.ceil(hours / 24)}d remaining`;
}

function getPriorityTag(ticket, effectivePriority) {
  if (effectivePriority === "critical") return "Critical Threat";
  if (ticket.terrainRisk?.includes("Landslide")) return "Landslide Risk";
  if (ticket.infrastructureType?.includes("Water")) return "Water Supply Impact";
  if (ticket.infrastructureType?.includes("Power")) return "Power Infrastructure";
  return ticket.infrastructureType || "Infrastructure Impact";
}

function getPriorityStyle(effectivePriority) {
  const styles = {
    critical: "text-[var(--pahadi-crimson)] bg-rose-50 border-rose-100",
    high: "text-amber-700 bg-amber-50 border-amber-100",
    medium: "text-blue-700 bg-blue-50 border-blue-100",
    low: "text-emerald-700 bg-emerald-50 border-emerald-100",
  };
  return styles[effectivePriority] || styles.medium;
}

function getStatusClass(status) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 border-amber-100",
    "Under Verification": "bg-sky-50 text-sky-700 border-sky-100",
    "Verified Resolved": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Reopened via Citizen Veto":
      "bg-rose-50 text-[var(--pahadi-crimson)] border-rose-100",
  };
  return styles[status] || "bg-slate-50 text-slate-600 border-slate-100";
}

function getUniqueOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function CommunityCard({
  ticket,
  isSelected,
  effectivePriority,
  criticalThreshold,
  nowMs,
  onOpenWorkspace,
  onOpenCollaboration,
  onUpvote,
}) {
  const tag = getPriorityTag(ticket, effectivePriority);
  const replies = Number(ticket.replies || ticket.replyCount || 0);
  const evidenceCount = Number(ticket.evidenceCount || 0);

  return (
    <article
      aria-current={isSelected ? "true" : undefined}
      className={cx(
        "group grid min-h-[260px] w-full cursor-pointer grid-cols-[220px_1fr] overflow-hidden rounded-md border bg-white shadow-[0_1px_6px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[var(--devdar-forest)]/30 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]",
        isSelected
          ? "border-[var(--devdar-forest)] ring-2 ring-[var(--devdar-forest)]/10"
          : "border-slate-200",
      )}
      role="button"
      tabIndex={0}
      onClick={() => onOpenWorkspace(ticket)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenWorkspace(ticket);
        }
      }}
    >
      <div className="relative bg-slate-100">
        <IncidentImage
          src={ticket.intakePhotoUrl}
          className="h-full min-h-[260px] w-full object-cover"
          fallbackClassName="h-full min-h-[260px] w-full"
        />
        <div className="absolute left-2 top-2 rounded-sm bg-white/90 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-700 shadow-sm">
          {ticket.id}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <span
            className={cx(
              "inline-flex max-w-full items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider",
              getPriorityStyle(effectivePriority),
            )}
          >
            <Flame className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{tag}</span>
          </span>
          {ticket.upvotes > criticalThreshold && (
            <span className="text-[8px] font-black uppercase tracking-wider text-[var(--pahadi-crimson)]">
              High Threat Emergency
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-[13px] font-black leading-snug text-slate-950">
          {ticket.title}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-[var(--pahadi-crimson)]" />
          <span className="truncate">
            {ticket.district} / {ticket.block} / {ticket.panchayat}
          </span>
        </p>

        <p className="mt-2 line-clamp-2 text-[10px] font-medium leading-5 text-slate-600">
          {ticket.description}
        </p>

        <div className="mt-auto pt-3">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              className="inline-flex h-7 items-center justify-center gap-1 rounded-sm border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-700 transition hover:border-[var(--pahadi-crimson)] hover:bg-rose-50 hover:text-[var(--pahadi-crimson)]"
              type="button"
              title="Support incident"
              onClick={(event) => {
                event.stopPropagation();
                onUpvote?.(ticket.id);
              }}
            >
              <ThumbsUp className="h-3 w-3" />
              {ticket.upvotes}
            </button>
            <button
              className="inline-flex h-7 items-center justify-center gap-1 rounded-sm border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-700 transition hover:border-[var(--devdar-forest)] hover:bg-slate-50"
              type="button"
              title="Reply to this incident"
              onClick={(event) => {
                event.stopPropagation();
                onOpenCollaboration(ticket);
              }}
            >
              <MessageCircle className="h-3 w-3" />
              {replies}
            </button>
            <div className="inline-flex h-7 items-center justify-center gap-1 rounded-sm border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-700">
              <Clock3 className="h-3 w-3" />
              {formatRelativeTime(ticket.createdAt, nowMs)}
            </div>
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
            <span className="inline-flex max-w-[105px] items-center gap-1 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{ticket.department || "Unassigned"}</span>
            </span>
            <button
              className="inline-flex max-w-[105px] items-center gap-1 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600 transition hover:border-[var(--devdar-forest)] hover:bg-white"
              type="button"
              title="Add or view evidence"
              onClick={(event) => {
                event.stopPropagation();
                onOpenCollaboration(ticket);
              }}
            >
              <Eye className="h-3 w-3 shrink-0" />
              <span className="truncate">{evidenceCount} evidence</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black text-slate-700">
                {ticket.citizenName || "Anonymous"}
              </p>
              <p className="flex items-center gap-1 text-[8px] font-bold text-emerald-700">
                <ShieldCheck className="h-2.5 w-2.5" />
                {ticket.isVerified ? "Verified Report" : "Pending Verification"}
              </p>
            </div>
            <span
              className={cx(
                "shrink-0 rounded-sm border px-2 py-1 text-[8px] font-black uppercase tracking-wider",
                getStatusClass(ticket.status),
              )}
            >
              {ticket.status === "Verified Resolved"
                ? "Resolved"
                : getSlaLabel(ticket, nowMs)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Avatar({ name, imageUrl = "" }) {
  const initials = String(name || "CM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CM";

  if (imageUrl) {
    return <img src={normalizeMediaUrl(imageUrl)} alt="" className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover" />;
  }

  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--devdar-forest)] text-[10px] font-black text-white">
      {initials}
    </div>
  );
}

function IncidentImage({ src, className, fallbackClassName }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cx("grid place-items-center bg-slate-100 text-slate-400", fallbackClassName || className)}>
        <ImagePlus className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function ImageLightbox({ images, index, onClose, onNavigate }) {
  useEffect(() => {
    if (!images.length) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) onNavigate(-1);
      if (event.key === "ArrowRight" && images.length > 1) onNavigate(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose, onNavigate]);

  if (!images.length) return null;
  const image = images[index];
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Evidence image viewer"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="relative flex max-h-full w-full max-w-6xl items-center justify-center">
        <img src={normalizeMediaUrl(image.imageUrl)} alt={image.description || "Evidence image"} className="max-h-[86vh] max-w-full rounded-lg object-contain shadow-2xl" />
        <button className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-lg" type="button" aria-label="Close image viewer" onClick={onClose}><X className="h-5 w-5" /></button>
        {images.length > 1 && <>
          <button className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-lg" type="button" aria-label="Previous image" onClick={() => onNavigate(-1)}><ChevronLeft className="h-5 w-5" /></button>
          <button className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-lg" type="button" aria-label="Next image" onClick={() => onNavigate(1)}><ChevronRight className="h-5 w-5" /></button>
        </>}
      </div>
    </div>
  );
}

function CollaborationModal({
  ticket,
  comments,
  evidence,
  loading,
  loadError,
  nowMs,
  commentText,
  proofPreview,
  submitError,
  submitting,
  onClose,
  onCommentTextChange,
  onProofFileChange,
  onOpenLightbox,
  onSubmit,
}) {
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="grid h-[92vh] w-[94vw] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl lg:h-[86vh] lg:w-[78vw] lg:grid-cols-[42%_58%]">
        <div className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
          <div className="relative h-[42%] min-h-52 bg-slate-100 lg:h-[52%]">
            <IncidentImage
              src={ticket.intakePhotoUrl}
              className="h-full w-full object-cover"
              fallbackClassName="h-full w-full"
            />
            <button
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/70 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900"
              type="button"
              aria-label="Close collaboration panel"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-wider text-[var(--devdar-forest)]">
                {ticket.id}
              </p>
              <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">
                {ticket.title}
              </h3>
              <p className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-[var(--pahadi-crimson)]" />
                {ticket.district} / {ticket.block} / {ticket.panchayat}
              </p>
            </div>

            <p className="rounded-md border border-slate-200 bg-white p-3 text-xs font-medium leading-6 text-slate-600">
              {ticket.description}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Support
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {ticket.upvotes} citizens
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Evidence
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {evidence.length} records
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Department
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  {ticket.department || "Unassigned"}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Status
                </p>
                <p className="mt-1 text-xs font-black text-slate-900">
                  {ticket.status}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-white">
          <div className="border-b border-slate-200 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
              Community Collaboration
            </p>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Evidence gallery</p>
              {evidence.length ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {evidence.map((item, index) => <button key={item.id} className="overflow-hidden rounded-md border border-slate-200 bg-white" type="button" onClick={() => onOpenLightbox(evidence, index)}><img src={normalizeMediaUrl(item.imageUrl)} alt={item.description || "Evidence"} className="h-16 w-full object-cover" /></button>)}
                </div>
              ) : <p className="mt-1 text-xs font-medium text-slate-500">No evidence uploaded yet.</p>}
            </div>
            <h3 className="mt-1 text-base font-black text-slate-950">
              Comments & Supporting Proof
            </h3>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4">
            {loading ? (
              <div className="grid h-full min-h-48 place-items-center rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-500">Loading persisted collaboration…</div>
            ) : comments.length === 0 ? (
              <div className="grid h-full min-h-48 place-items-center rounded-md border border-dashed border-slate-200 bg-white p-8 text-center">
                <div>
                  <MessageCircle className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    No community comments yet. Add context or proof for this incident.
                  </p>
                </div>
              </div>
            ) : (
              comments.map((comment) => (
                <article key={comment.id} className="flex items-start gap-3">
                  <Avatar name={comment.author} imageUrl={comment.avatarUrl} />
                  <div className="min-w-0 max-w-[86%]">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-xs font-black text-slate-800">
                        {comment.author}
                      </p>
                      <span className="text-[9px] font-semibold text-slate-400">
                        {formatRelativeTime(comment.createdAt, nowMs)}
                      </span>
                    </div>
                    {comment.text && (
                      <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
                        {comment.text}
                      </div>
                    )}
                    {comment.imageUrl && (
                      <button className="mt-2 block overflow-hidden rounded-xl border border-slate-200" type="button" onClick={() => onOpenLightbox(evidence, Math.max(0, evidence.findIndex((item) => item.id === comment.evidenceId)))}><img src={normalizeMediaUrl(comment.imageUrl)} alt="Attached community proof" className="max-h-56 w-full object-cover shadow-sm" /></button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          <form className="border-t border-slate-200 bg-white p-3" onSubmit={onSubmit}>
            <div className="mb-2 flex items-center gap-3">
              <Avatar name={UNAUTHENTICATED_COMMENTER} />
              <p className="text-xs font-black text-slate-700">{UNAUTHENTICATED_COMMENTER}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              <textarea
                className="h-14 w-full resize-none rounded-xl bg-transparent px-3 py-1.5 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Add a comment, local update, or verification note..."
                value={commentText}
                onChange={(event) => onCommentTextChange(event.target.value)}
              />

              {proofPreview && (
                <div className="mx-2 mb-1.5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1.5">
                  <img
                    src={proofPreview}
                    alt=""
                    className="h-12 w-20 rounded-lg object-cover"
                  />
                  <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-600">
                    Proof image attached
                  </p>
                  <button
                    className="text-xs font-black uppercase text-[var(--pahadi-crimson)]"
                    type="button"
                    onClick={() => onProofFileChange(null)}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-2 pt-1.5">
                <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-[var(--devdar-forest)]">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Attach Proof
                  <input
                    className="sr-only"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(event) => onProofFileChange(event.target.files?.[0] || null)}
                  />
                </label>

                <button
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-[var(--devdar-forest)] px-4 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
                  type="submit"
                  disabled={submitting || (!commentText.trim() && !proofPreview)}
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Sending" : "Post"}
                </button>
              </div>
            </div>

            {submitError && (
              <p className="mt-2 text-xs font-bold text-[var(--pahadi-crimson)]">
                {submitError}
              </p>
            )}
            {loadError && <p className="mt-2 text-xs font-bold text-[var(--pahadi-crimson)]">{loadError}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}

export default function IncidentQueue({
  tickets,
  selectedTicketId,
  onOpenWorkspace,
  onUpvote,
  nowMs,
  districts = [],
  criticalThreshold = 30,
  priorityLabels = defaultPriorityLabels,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [sortBy, setSortBy] = useState("upvotes");
  const [pageIndex, setPageIndex] = useState(0);
  const [carouselDirection, setCarouselDirection] = useState("forward");
  const [isCarouselSliding, setIsCarouselSliding] = useState(false);
  const [collaborationTicket, setCollaborationTicket] = useState(null);
  const [collaborationLoading, setCollaborationLoading] = useState(false);
  const [collaborationError, setCollaborationError] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview("");
      return undefined;
    }

    const nextPreview = URL.createObjectURL(proofFile);
    setProofPreview(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [proofFile]);

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
        const effectivePriority = getEffectivePriority(ticket, criticalThreshold);
        const searchText = [
          ticket.id,
          ticket.title,
          ticket.district,
          ticket.block,
          ticket.panchayat,
          ticket.status,
          ticket.infrastructureType,
          ticket.department,
          priorityLabels[effectivePriority],
        ]
          .map(normalize)
          .join(" ");

        const matchesSearch = !query || searchText.includes(query);
        const matchesStatus =
          statusFilter === ALL_FILTER || ticket.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        if (sortBy === "latest") {
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }

        if (sortBy === "pending") {
          return left.status === "Pending" ? -1 : right.status === "Pending" ? 1 : 0;
        }

        const rightPriority = getEffectivePriority(right, criticalThreshold);
        const leftPriority = getEffectivePriority(left, criticalThreshold);
        if (sortBy === "priority") {
          const delta = (priorityRank[rightPriority] || 0) - (priorityRank[leftPriority] || 0);
          if (delta !== 0) return delta;
        }

        const supportDelta = Number(right.upvotes || 0) - Number(left.upvotes || 0);
        if (supportDelta !== 0) return supportDelta;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [tickets, searchQuery, statusFilter, sortBy, criticalThreshold, priorityLabels]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, statusFilter, sortBy, filteredTickets.length]);

  const maxCarouselIndex = Math.max(0, filteredTickets.length - 2);
  const pageTickets = filteredTickets.slice(pageIndex, pageIndex + 2);
  const showLeftArrow = filteredTickets.length > 2 && pageIndex > 0;
  const showRightArrow = filteredTickets.length > 2 && pageIndex < maxCarouselIndex;
  const supportCount = tickets.reduce((sum, ticket) => sum + Number(ticket.upvotes || 0), 0);
  const activeComments = collaborationTicket?.comments || [];
  const activeEvidence = collaborationTicket?.evidence || [];

  function moveCarousel(offset) {
    if (isCarouselSliding) return;
    const next = Math.max(0, Math.min(maxCarouselIndex, pageIndex + offset));
    if (next === pageIndex) return;
    setCarouselDirection(offset > 0 ? "forward" : "backward");
    setIsCarouselSliding(true);
    setPageIndex(next);
  }

  function normalizeCollaborationPayload(ticket, payload) {
    return {
      ...ticket,
      evidence: (payload.evidence || [])
        .filter((item) => item.image_url || item.imageUrl)
        .map((item) => ({
          id: item.id,
          imageUrl: item.image_url || item.imageUrl,
          description: item.description || item.summary || "Evidence image",
        })),
      comments: (payload.community_comments || []).map((item) => ({
        id: item.id,
        author: item.author || "Community Member",
        text: item.text || item.comment || "",
        imageUrl: item.image_url || item.imageUrl || "",
        evidenceId: item.evidence_id || item.evidenceId || null,
        createdAt: item.created_at || item.createdAt,
      })),
    };
  }

  async function loadCollaboration(ticket) {
    const response = await fetch(`${BACKEND_URL}/api/incidents/${ticket.id}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || "Unable to load persisted collaboration.");
    }
    const payload = await response.json();
    setCollaborationTicket((current) => (
      current?.id === ticket.id ? normalizeCollaborationPayload(current, payload) : current
    ));
  }

  function openCollaboration(ticket) {
    setCollaborationTicket({ ...ticket, comments: [], evidence: [] });
    setCollaborationLoading(true);
    setCollaborationError("");
    setSubmitError("");
    setCommentText("");
    setProofFile(null);
    loadCollaboration(ticket)
      .catch((error) => setCollaborationError(error.message))
      .finally(() => setCollaborationLoading(false));
  }

  function closeCollaboration() {
    setCollaborationTicket(null);
    setCollaborationError("");
    setSubmitError("");
    setCommentText("");
    setProofFile(null);
  }

  async function submitCommunityReply(event) {
    event.preventDefault();
    if (!collaborationTicket || (!commentText.trim() && !proofFile)) return;

    setSubmitting(true);
    setSubmitError("");

    const formData = new FormData();
    formData.append("comment", commentText.trim() || "Proof image attached.");
    formData.append("uploadedBy", UNAUTHENTICATED_COMMENTER);
    if (proofFile) formData.append("file", proofFile);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/incidents/${collaborationTicket.id}/community-replies`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Unable to post community reply.");
      }

      await response.json();
      await loadCollaboration(collaborationTicket);
      setCommentText("");
      setProofFile(null);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_8px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-950">
            Community Discovery • Highest Supported Citizen Reports
          </h2>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">
            Reports with the highest public support surface first for greater visibility and accountability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative hidden sm:block">
            <span className="sr-only">Search community reports</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-8 w-52 rounded-full border border-slate-200 bg-slate-50 pl-8 pr-3 text-[10px] font-bold text-slate-700 outline-none transition focus:border-[var(--devdar-forest)] focus:bg-white"
              placeholder="Search reports"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <button
            className={cx(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black uppercase tracking-wider",
              sortBy === "upvotes"
                ? "border-[var(--devdar-forest)] bg-[var(--devdar-forest)] text-white"
                : "border-slate-200 bg-white text-slate-700",
            )}
            type="button"
            onClick={() => setSortBy("upvotes")}
          >
            <Flame className="h-3 w-3" />
            Trending
          </button>
          <button
            className={cx(
              "h-8 rounded-full border px-3 text-[10px] font-black uppercase tracking-wider",
              sortBy === "latest"
                ? "border-[var(--devdar-forest)] bg-[var(--devdar-forest)] text-white"
                : "border-slate-200 bg-white text-slate-700",
            )}
            type="button"
            onClick={() => setSortBy("latest")}
          >
            Latest
          </button>
          <button
            className={cx(
              "h-8 rounded-full border px-3 text-[10px] font-black uppercase tracking-wider",
              sortBy === "priority"
                ? "border-[var(--devdar-forest)] bg-[var(--devdar-forest)] text-white"
                : "border-slate-200 bg-white text-slate-700",
            )}
            type="button"
            onClick={() => setSortBy("priority")}
          >
            Most Supported
          </button>
          <select
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            title="Filter by status"
          >
            <option value={ALL_FILTER}>Pending</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--devdar-forest)]/30 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-[var(--devdar-forest)]"
            type="button"
            onClick={() => {
              setStatusFilter(ALL_FILTER);
              setSearchQuery("");
              setSortBy("upvotes");
            }}
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
        <span>{tickets.length} reports</span>
        <span>•</span>
        <span>{supportCount} public supports</span>
        {districtOptions.length > 0 && (
          <>
            <span>•</span>
            <span>{districtOptions.length} districts</span>
          </>
        )}
      </div>

      <div className="relative mt-4">
        {showLeftArrow && (
          <button
            className="absolute left-0 top-1/2 z-10 grid h-10 w-10 -translate-x-3 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:border-[var(--devdar-forest)] hover:text-[var(--devdar-forest)]"
            type="button"
            aria-label="Previous community reports"
            disabled={isCarouselSliding}
            onClick={() => moveCarousel(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {showRightArrow && (
          <button
            className="absolute right-0 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 translate-x-3 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:border-[var(--devdar-forest)] hover:text-[var(--devdar-forest)]"
            type="button"
            aria-label="Next community reports"
            disabled={isCarouselSliding}
            onClick={() => moveCarousel(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div
          key={pageIndex}
          className={`grid gap-3 lg:grid-cols-2 ${carouselDirection === "forward" ? "community-carousel-slide-forward" : "community-carousel-slide-backward"}`}
          onAnimationEnd={() => setIsCarouselSliding(false)}
        >
        {pageTickets.length > 0 ? (
          pageTickets.map((ticket) => {
            const effectivePriority = getEffectivePriority(ticket, criticalThreshold);
            const displayTicket = {
              ...ticket,
              replyCount: collaborationTicket?.id === ticket.id ? activeComments.length : ticket.replyCount || 0,
            };
            return (
              <CommunityCard
                key={ticket.id}
                ticket={displayTicket}
                isSelected={selectedTicketId === ticket.id}
                effectivePriority={effectivePriority}
                criticalThreshold={criticalThreshold}
                nowMs={nowMs}
                onOpenWorkspace={onOpenWorkspace}
                onOpenCollaboration={openCollaboration}
                onUpvote={onUpvote}
              />
            );
          })
        ) : (
          <div className="grid min-h-40 w-full place-items-center rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div>
              <Plus className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 text-xs font-bold text-slate-500">
                No community reports match the current filters.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
      <CollaborationModal
        ticket={collaborationTicket}
        comments={activeComments}
        evidence={activeEvidence}
        loading={collaborationLoading}
        loadError={collaborationError}
        nowMs={nowMs}
        commentText={commentText}
        proofPreview={proofPreview}
        submitError={submitError}
        submitting={submitting}
        onClose={closeCollaboration}
        onCommentTextChange={setCommentText}
        onProofFileChange={setProofFile}
        onOpenLightbox={(images, index) => setLightbox({ images, index })}
        onSubmit={submitCommunityReply}
      />
      <ImageLightbox
        images={lightbox?.images || []}
        index={lightbox?.index || 0}
        onClose={() => setLightbox(null)}
        onNavigate={(direction) => setLightbox((current) => current && ({ ...current, index: (current.index + direction + current.images.length) % current.images.length }))}
      />
    </section>
  );
}
