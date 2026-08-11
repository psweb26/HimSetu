/**
 * HimSetu Design System V2 - Typography & Micro-Interactions
 * 
 * This file documents the standardized typography hierarchy and micro-interaction patterns
 * to be applied across all components for a consistent government-grade aesthetic.
 */

/* ============================================================================
   SECTION 5: TYPOGRAPHY HIERARCHY
   ============================================================================ */

/*
  @layer base - Typography Standards
  
  All text should follow this hierarchy for consistent government report styling.
  Avoid generic Tailwind sizes; use these standards.
*/

export const TYPOGRAPHY = {
  // Eyebrow / Badge labels
  eyebrow: {
    fontSize: "9px",      // text-[9px]
    fontWeight: "black",  // font-black
    textTransform: "uppercase",
    letterSpacing: "0.1em", // tracking-widest
    lineHeight: "1",
  },

  // Section headers
  sectionTitle: {
    fontSize: "14px",     // text-sm
    fontWeight: "black",  // font-black
    textTransform: "uppercase",
    letterSpacing: "0.05em", // tracking-tight
    lineHeight: "1.2",
  },

  // Section descriptions
  sectionDescription: {
    fontSize: "11px",     // text-[11px]
    fontWeight: "500",    // font-medium
    color: "#64748b",     // text-slate-600
    lineHeight: "1.5",
  },

  // Metric labels
  metricLabel: {
    fontSize: "10px",     // text-[10px]
    fontWeight: "black",  // font-black
    textTransform: "uppercase",
    letterSpacing: "0.075em", // tracking-widest
  },

  // Metric values
  metricValue: {
    fontSize: "18px",     // text-lg / 22px max
    fontWeight: "black",  // font-black
    lineHeight: "1",
  },

  // Incident titles
  incidentTitle: {
    fontSize: "18px",     // text-base / sm
    fontWeight: "bold",   // font-bold
    lineHeight: "1.4",
  },

  // Body text (descriptions, explanations)
  body: {
    fontSize: "13px",     // text-xs / sm hybrid
    fontWeight: "500",    // font-medium
    color: "#475569",     // text-slate-700
    lineHeight: "1.6",
  },

  // Form labels
  formLabel: {
    fontSize: "10px",     // text-[10px]
    fontWeight: "black",  // font-black
    textTransform: "uppercase",
    letterSpacing: "0.05em", // tracking-wide
  },

  // Form placeholder / hint
  formHint: {
    fontSize: "10px",     // text-[10px]
    fontWeight: "500",    // font-medium
    color: "#94a3b8",     // text-slate-400
  },
};

/* ============================================================================
   SECTION 6: MICRO-INTERACTIONS
   ============================================================================ */

/*
  Subtle, refined animations that enhance UX without being distracting.
  All timings use cubic-bezier(.4,0,.2,1) for natural easing.
*/

export const MICRO_INTERACTIONS = {
  // Button hover: slightly darker background
  buttonHover: {
    className: "hover:brightness-95 transition-all duration-200",
    description: "Subtle darkening on hover, smooth 200ms transition",
  },

  // Rows: lift 2px on hover
  rowHover: {
    className: "hover:-translate-y-0.5 transition-all duration-200",
    description: "Lift 2px (0.5 = 2px) with smooth transition",
  },

  // Cards: border transition
  cardHover: {
    className: "hover:border-[var(--devdar-forest)] transition-colors duration-250",
    description: "Border color smoothly transitions to devdar forest green",
  },

  // Progress animation (lifecycle timeline)
  progressAnimate: {
    className: "transition-all duration-500",
    description: "Smooth 500ms transition for progress bar fills",
  },

  // Live indicator: soft pulse
  livePulse: {
    className: "animate-pulse",
    keyframes: `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `,
    description: "Soft breathing pulse effect for live status indicators",
  },

  // Map selection: smooth zoom
  mapZoom: {
    className: "transition-all duration-300",
    description: "Smooth 300ms zoom/pan animation on district selection",
  },

  // Form focus ring
  focusRing: {
    className: "focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10",
    description: "Devdar border + subtle ring on input focus",
  },

  // Badge transitions
  badgeTransition: {
    className: "transition-colors duration-200",
    description: "Smooth badge color changes (200ms)",
  },
};

/* ============================================================================
   SECTION 7: ICON USAGE (Lucide Only)
   ============================================================================ */

/*
  All icons must be from Lucide React.
  No emojis. Icons should be 16px-24px for visibility in government context.
*/

export const ICON_MAPPING = {
  // Infrastructure types
  infrastructure: {
    bridge: "Bridge",
    road: "Road",
    water: "Droplet",
    electricity: "Zap",
    heritage: "Building2",
  },

  // Telemetry / Status
  telemetry: {
    incident: "AlertTriangle",
    verification: "CheckCircle2",
    department: "Building2",
    upvote: "ThumbsUp",
    time: "Clock3",
    location: "MapPin",
    live: "Radio",
    flame: "Flame",
  },

  // Actions
  actions: {
    search: "Search",
    filter: "SlidersHorizontal",
    sort: "ArrowUpDown",
    zoomIn: "Plus",
    zoomOut: "Minus",
    reset: "RotateCcw",
    download: "Download",
    close: "X",
  },

  // States
  states: {
    pending: "AlertCircle",
    active: "Flame",
    resolved: "CheckCircle2",
    reopened: "AlertCircle",
  },
};

/* ============================================================================
   SECTION 8: COMPONENT STRUCTURE (Reusable Components)
   ============================================================================ */

/*
  Extract and standardize these components across the codebase.
  Reduces duplication and enforces consistency.
*/

export const REUSABLE_COMPONENTS = {
  // SectionHeader: Icon + Title + Description
  SectionHeader: {
    props: ["icon", "title", "description"],
    purpose: "Consistent section branding with icon, title, and optional description",
    example: `
      <SectionHeader
        icon={FileText}
        title="Reporter Information"
        description="Basic identification for incident registration and follow-up communication."
      />
    `,
  },

  // TelemetryCard: Icon + Label + Value with tone
  TelemetryCard: {
    props: ["icon", "label", "value", "tone"],
    purpose: "Display metric with icon, uppercase label, and color-coded value",
    example: `
      <TelemetryCard
        icon={MapPin}
        label="District / Block"
        value="Kullu"
        tone="text-devdar-forest"
      />
    `,
  },

  // GovernmentField: Label + Required badge + Description + Input
  GovernmentField: {
    props: ["label", "description", "required", "children"],
    purpose: "Wrapper for form fields with consistent styling and labeling",
    example: `
      <GovernmentField label="Incident Title" required>
        <GovernmentInput type="text" placeholder="..." />
      </GovernmentField>
    `,
  },

  // StatusBadge: Colored badge with status text and optional live indicator
  StatusBadge: {
    props: ["status"],
    purpose: "Display incident status with HimSetu colors and live radio pulse",
    example: `<StatusBadge status="Pending" />`,
  },

  // PriorityBadge: Colored priority badge (Critical, High, Medium, Low)
  PriorityBadge: {
    props: ["priority"],
    purpose: "Display priority level with appropriate color and icon",
    example: `<PriorityBadge priority="critical" />`,
  },

  // MetricTile: Icon + Label + Value in bordered government card
  MetricTile: {
    props: ["icon", "label", "value", "color"],
    purpose: "Compact metric display in government report style",
    example: `
      <MetricTile
        icon={FileCheck2}
        label="Evidence Records"
        value={data.summary.evidence_count}
        color="indigo"
      />
    `,
  },

  // LifecycleTimeline: Animated progress through incident stages
  LifecycleTimeline: {
    props: ["status"],
    purpose: "Show incident resolution progress with connected nodes",
    example: `<LifecycleTimeline status={data.incident.current_state} />`,
  },

  // OperationsToolbar: Compact search + filters + result summary
  OperationsToolbar: {
    props: ["searchQuery", "filters", "resultCount", "activeDistrict"],
    purpose: "GIS-style toolbar for queue filtering and searching",
    example: `
      <OperationsToolbar
        searchQuery={search}
        filters={{ status, priority, district, sort }}
        resultCount={filtered.length}
        activeDistrict={districtFilter}
      />
    `,
  },

  // QueueRow: Compact incident strip with colored left border
  QueueRow: {
    props: ["incident", "isSelected", "onSelect", "onUpvote", "onOpenWorkspace"],
    purpose: "Single-line incident display with priority indicator and actions",
    example: `
      <QueueRow
        incident={ticket}
        isSelected={selectedId === ticket.id}
        onSelect={() => handleSelect(ticket)}
      />
    `,
  },
};

export default TYPOGRAPHY;
