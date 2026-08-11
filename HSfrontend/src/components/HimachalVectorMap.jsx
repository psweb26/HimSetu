import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, RotateCcw, MapPin, Activity } from "lucide-react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// SVG coordinate boundaries for active regions
import HimachalDistricts from "../assets/svg/himachal_districts.svg?react";

const DISTRICT_GRADIENTS = {
  Chamba: ["#DCE8FA", "#BDD3F4", "#8FB4E6", "#5E8DC8"],
  Kangra: ["#F5DAD5", "#EDB8AC", "#D98D73", "#B85E38"],
  Una: ["#E8F2D5", "#CFE3A5", "#AAC86A", "#7E9E45"],
  Hamirpur: ["#FAE8BE", "#F2D68A", "#D7B357", "#A8812E"],
  Bilaspur: ["#DCE8E3", "#BED3CB", "#8FB3A6", "#5D7F74"],
  Solan: ["#E5F1E1", "#C6DEBD", "#93BC8C", "#5E885B"],
  Sirmaur: ["#F0E1F6", "#DABBE8", "#B58DCB", "#8B5BA3"],
  Shimla: ["#F8F1D8", "#EAD9A5", "#D3B86C", "#A8883E"],
  Kinnaur: ["#F3DED5", "#E7BDAF", "#CB8E73", "#A95D43"],
  "Lahaul & Spiti": ["#E5ECF7", "#C8D8F1", "#94B1DE", "#607FB8"],
  Mandi: ["#E8DDD3", "#D6C2B0", "#B19171", "#88664C"],
  Kullu: ["#F5E3EC", "#E5BED1", "#C989AE", "#99597C"],
};

const DISTRICT_NAME_MAP = {
  LahaulSpiti: "Lahaul & Spiti",
  Hamirpur: "Hamirpur",
  Kangra: "Kangra",
  Shimla: "Shimla",
  Kullu: "Kullu",
  Mandi: "Mandi",
  Chamba: "Chamba",
  Bilaspur: "Bilaspur",
  Una: "Una",
  Solan: "Solan",
  Sirmaur: "Sirmaur",
  Kinnaur: "Kinnaur",
};

const DEFAULT_FILTER =
  "brightness(1.06) drop-shadow(0 0 6px rgba(80,120,140,.25))";

const SELECTED_FILTER =
  "brightness(1.12) saturate(1.15) drop-shadow(0 0 8px rgba(45,79,88,.25))";

function StatCard({ label, value, icon: Icon, tone = "slate" }) {
  const toneClasses = {
    slate: "text-slate-700",
    crimson: "text-[var(--pahadi-crimson)]",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
  };

  return (
    <div className="rounded-sm border border-[var(--him-stone)] bg-white p-3 shadow-xs">
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <div className="grid h-6 w-6 place-items-center rounded-xs border border-[var(--him-stone)] bg-[#F8FAFB]">
            <Icon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
          </div>
        )}
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
          {label}
        </p>
      </div>
      <p className={`text-base font-black ${toneClasses[tone]}`}>
        {value}
      </p>
    </div>
  );
}

export default function HimachalVectorMap({
  selectedDistrict,
  onSelectDistrict,
  grievances = [],
}) {
  const mapContainerRef = useRef(null);
  const transformRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const filteredGrievances = useMemo(() => {
    if (!selectedDistrict) return grievances;

    return grievances.filter((g) => g.district === selectedDistrict);
  }, [grievances, selectedDistrict]);

  const districtCounts = useMemo(() => {
    const counts = {};

    grievances.forEach((g) => {
      counts[g.district] = (counts[g.district] || 0) + 1;
    });

    return counts;
  }, [grievances]);

  const stats = useMemo(() => {
    return {
      critical: filteredGrievances.filter((g) => g.priority === "critical").length,
      high: filteredGrievances.filter((g) => g.priority === "high").length,
      resolved: filteredGrievances.filter((g) => g.status === "resolved").length,
      total: filteredGrievances.length,
    };
  }, [filteredGrievances]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const svg = mapContainerRef.current.querySelector(".district-map");
    if (!svg) return;

    const districts = Array.from(svg.querySelectorAll("path[id]"));

    function getDistrictName(district) {
      return DISTRICT_NAME_MAP[district.id] || district.id;
    }

    function getFillColor(districtName) {
      const count = districtCounts[districtName] || 0;
      const shades = DISTRICT_GRADIENTS[districtName] ?? [
        "#EEEEEE",
        "#DDDDDD",
        "#CCCCCC",
        "#BBBBBB",
      ];

      return count <= 2
        ? shades[0]
        : count <= 4
          ? shades[1]
          : count <= 6
            ? shades[2]
            : shades[3];
    }

    function applyBaseStyle(district, districtName) {
      district.style.fill = getFillColor(districtName);
      district.style.stroke = "#718096";
      district.style.strokeWidth = "1";
      district.style.cursor = "pointer";
      district.style.transition =
        "fill .25s cubic-bezier(.4,0,.2,1), stroke .25s cubic-bezier(.4,0,.2,1), filter .25s cubic-bezier(.4,0,.2,1)";
      district.style.filter = DEFAULT_FILTER;
    }

    function applySelectedStyle(district, districtName) {
      const selectedShades = DISTRICT_GRADIENTS[districtName] ?? [
        "#EEEEEE",
        "#DDDDDD",
        "#CCCCCC",
        "#BBBBBB",
      ];

      district.style.fill = selectedShades[3];
      district.style.stroke = "#2D4F58";
      district.style.strokeWidth = "2";
      district.style.filter = SELECTED_FILTER;
    }

    let activeDistrict = null;

    districts.forEach((district) => {
      const districtName = getDistrictName(district);
      const isSelected = selectedDistrict === districtName;

      applyBaseStyle(district, districtName);

      if (isSelected) {
        activeDistrict = district;
        applySelectedStyle(district, districtName);
      }

      district.addEventListener("mouseenter", () => {
        if (selectedDistrict) return;

        district.style.filter = "brightness(1.08) saturate(1.08)";
        district.style.stroke = "#365C68";

        const districtGrievances = grievances.filter(
          (g) => g.district === districtName,
        );

        const critical = districtGrievances.filter(
          (g) => g.priority === "critical",
        ).length;

        const high = districtGrievances.filter(
          (g) => g.priority === "high",
        ).length;

        const resolved = districtGrievances.filter(
          (g) => g.status === "Verified Resolved",
        ).length;

        setTooltip({
          district: districtName,
          total: districtGrievances.length,
          critical,
          high,
          resolved,
          x: 0,
          y: 0,
        });
      });

      district.addEventListener("click", () => {
        const clickedDistrict = getDistrictName(district);
        const isDeselecting = selectedDistrict === clickedDistrict;

        if (activeDistrict) {
          applyBaseStyle(activeDistrict, getDistrictName(activeDistrict));
        }

        if (isDeselecting) {
          activeDistrict = null;
          onSelectDistrict?.(null);
          return;
        }

        activeDistrict = district;
        applySelectedStyle(district, clickedDistrict);

        setTooltip(null);
        onSelectDistrict?.(clickedDistrict);
      });

      district.addEventListener("mouseleave", () => {
        if (district === activeDistrict) {
          applySelectedStyle(district, getDistrictName(district));
        } else {
          district.style.filter = DEFAULT_FILTER;
          district.style.stroke = "#718096";
          district.style.strokeWidth = "1";
        }

        if (!selectedDistrict) {
          setTooltip(null);
        }
      });

      district.addEventListener("mousemove", (e) => {
        if (selectedDistrict) return;
        const rect = mapContainerRef.current.getBoundingClientRect();

        const TOOLTIP_WIDTH = 270;
        const TOOLTIP_HEIGHT = 190;

        let left = e.clientX - rect.left + 18;
        let top = e.clientY - rect.top + 18;

        if (left + TOOLTIP_WIDTH > rect.width) {
          left = e.clientX - rect.left - TOOLTIP_WIDTH - 18;
        }

        if (left < 15) left = 15;

        if (top + TOOLTIP_HEIGHT > rect.height) {
          top = e.clientY - rect.top - TOOLTIP_HEIGHT - 18;
        }

        if (top < 15) top = 15;

        setTooltip((t) => ({
          ...t,
          x: left,
          y: top,
        }));
      });
    });

    const zoomFrame = window.requestAnimationFrame(() => {
      if (activeDistrict && selectedDistrict) {
        transformRef.current?.zoomToElement(activeDistrict, 2.25, 500);
        return;
      }

      transformRef.current?.resetTransform(300);
    });

    return () => {
      window.cancelAnimationFrame(zoomFrame);
      districts.forEach((district) => {
        const clone = district.cloneNode(true);
        district.replaceWith(clone);
      });
    };
  }, [onSelectDistrict, selectedDistrict, districtCounts, grievances]);

  return (
    <div className="kathkuni-card bg-white p-6 h-full flex flex-col space-y-4">
      {/* HEADER */}
      <div className="flex items-start justify-between border-b border-[var(--him-stone)] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
            Geospatial Command Division
          </p>
          <h2 className="mt-1 text-sm font-black text-[var(--devdar-forest)] uppercase tracking-tight">
            क्षेत्र निगरानी — District Incident Overview
          </h2>
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB]">
          <MapPin className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
        </div>
      </div>

      {/* TOP STATS: Districts, Reports, Critical, Resolved */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Districts"
          value={selectedDistrict ? 1 : 12}
          icon={MapPin}
        />
        <StatCard
          label="Reports"
          value={stats.total}
          icon={Activity}
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          tone="crimson"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          tone="emerald"
        />
      </div>

      {/* WOVEN DIVIDER */}
      <div className="himachali-weave-divider" />

      {/* MAP VIEWPORT */}
      <div
        ref={mapContainerRef}
        className="relative flex-1 min-h-[400px] rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] overflow-hidden"
      >
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={5}
          wheel={{ step: 0.15 }}
          doubleClick={{ disabled: false }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* ZOOM CONTROLS */}
              <div className="absolute top-4 right-4 z-30 flex flex-col overflow-hidden rounded-sm border border-[var(--him-stone)] bg-white shadow-xs">
                <button
                  onClick={() => zoomIn()}
                  title="Zoom in"
                  className="flex h-8 w-8 items-center justify-center border-b border-[var(--him-stone)] transition hover:bg-[#F8FAFB]"
                >
                  <Plus className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
                </button>

                <button
                  onClick={() => zoomOut()}
                  title="Zoom out"
                  className="flex h-8 w-8 items-center justify-center border-b border-[var(--him-stone)] transition hover:bg-[#F8FAFB]"
                >
                  <Minus className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
                </button>

                <button
                  onClick={() => resetTransform()}
                  title="Reset view"
                  className="flex h-8 w-8 items-center justify-center transition hover:bg-[#F8FAFB]"
                >
                  <RotateCcw className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
                </button>
              </div>

              {/* MAP */}
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full flex items-center justify-center"
              >
                <HimachalDistricts className="district-map max-h-full max-w-full transition-all duration-300" />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {/* SELECTED DISTRICT BADGE */}
        {selectedDistrict && (
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-2 rounded-sm border border-[var(--him-stone)] bg-white/95 shadow-xs backdrop-blur-sm px-3 py-2">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--devdar-forest)]" aria-hidden="true" />
              <span className="text-xs font-bold text-[var(--devdar-forest)] whitespace-nowrap">
                {selectedDistrict}
              </span>
              <button
                onClick={() => onSelectDistrict?.(null)}
                title="Clear selection"
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-xs text-slate-400 hover:bg-rose-100 hover:text-[var(--pahadi-crimson)] transition font-bold text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM LEGEND */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--him-stone)] bg-white/95 backdrop-blur-sm px-4 py-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-xs" style={{ backgroundColor: "#E5ECF7" }} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-xs" style={{ backgroundColor: "#94B1DE" }} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-xs" style={{ backgroundColor: "#5E8DC8" }} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-xs" style={{ backgroundColor: "#2D4F58" }} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Critical</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 font-medium">
            Shading intensity shows incident density per district while maintaining cultural heritage palette.
          </p>
        </div>

        {/* TOOLTIP */}
        {tooltip && (
          <div
            className="absolute z-50 w-64 rounded-sm border border-[var(--him-stone)] bg-white/95 backdrop-blur-sm shadow-xs pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate3d(0,0,0)",
            }}
          >
            <div className="flex items-center gap-2 border-b border-[var(--him-stone)] px-3 py-2 mb-2">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--devdar-forest)]" aria-hidden="true" />
              <h3 className="font-bold text-sm text-[var(--devdar-forest)]">
                {tooltip.district}
              </h3>
            </div>

            <div className="space-y-1.5 px-3 pb-3 text-[10px]">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Total Reports</span>
                <span className="font-black text-slate-900">{tooltip.total}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-[var(--pahadi-crimson)]">Critical</span>
                <span className="font-black text-[var(--pahadi-crimson)]">{tooltip.critical}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-amber-700">High</span>
                <span className="font-black text-amber-700">{tooltip.high}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-emerald-700">Resolved</span>
                <span className="font-black text-emerald-700">{tooltip.resolved}</span>
              </div>

              <div className="border-t border-[var(--him-stone)] mt-2 pt-2 text-slate-500">
                Click to filter →
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
