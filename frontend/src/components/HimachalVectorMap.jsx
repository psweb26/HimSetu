import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, RotateCcw, MapPin } from "lucide-react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// SVG coordinate boundaries for active regions
import HimachalDistricts from "../assets/himachal_districts.svg?react";

/*
const DISTRICT_COLORS = {
  Chamba: "#C8D7F0", // Mist Blue
  Kangra: "#E7C8C2", // Apple Blossom
  Una: "#DDE8C8", // Terrace Green
  Hamirpur: "#EFDDB8", // Wheat Gold
  Bilaspur: "#C9D8D3", // River Stone
  Solan: "#D4E4D2", // Pine Meadow
  Sirmaur: "#D8C8E6", // Lavender Hills
  Shimla: "#E8E1C7", // Heritage Cream
  Kinnaur: "#E7CFC4", // Apricot Clay
  "Lahaul & Spiti": "#D7DDEB", // Glacier Blue
  Mandi: "#DCCFC3", // Cedar Wood
  Kullu: "#EAD8DF", // Rhododendron Pink
}; */

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

// const HOVER_FILTER = "brightness(1.08) saturate(1.10)";

const SELECTED_FILTER =
  "brightness(1.12) saturate(1.15) drop-shadow(0 0 8px rgba(45,79,88,.25))";

export default function HimachalVectorMap({
  selectedDistrict,
  onSelectDistrict,
  grievances = [],
}) {
  const mapContainerRef = useRef(null);
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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const svg = mapContainerRef.current.querySelector("svg");
    const districts = svg.querySelectorAll("path[id]");

    let activeDistrict = null;
    districts.forEach((district) => {
      const districtName = DISTRICT_NAME_MAP[district.id] || district.id;

      const count = districtCounts[districtName] || 0;

      const shades = DISTRICT_GRADIENTS[districtName] ?? [
        "#EEEEEE",
        "#DDDDDD",
        "#CCCCCC",
        "#BBBBBB",
      ];

      const fillColor =
        count <= 2
          ? shades[0]
          : count <= 4
            ? shades[1]
            : count <= 6
              ? shades[2]
              : shades[3];

      district.style.fill = fillColor;

      district.style.stroke = "#718096";
      district.style.strokeWidth = "1";

      district.style.cursor = "pointer";
      district.style.transition =
        "fill .25s cubic-bezier(.4,0,.2,1), \
stroke .25s cubic-bezier(.4,0,.2,1), \
filter .25s cubic-bezier(.4,0,.2,1)";

      district.style.filter =
        "brightness(1.06) drop-shadow(0 0 6px rgba(80,120,140,.25))";

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
          (g) => g.status === "resolved",
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
        const clickedDistrict = DISTRICT_NAME_MAP[district.id] || district.id;

        const isDeselecting = selectedDistrict === clickedDistrict;

        if (activeDistrict) {
          const previousName =
            DISTRICT_NAME_MAP[activeDistrict.id] || activeDistrict.id;

          const previousCount = districtCounts[previousName] || 0;

          const previousShades = DISTRICT_GRADIENTS[previousName] ?? [
            "#EEEEEE",
            "#DDDDDD",
            "#CCCCCC",
            "#BBBBBB",
          ];

          const previousFill =
            previousCount <= 2
              ? previousShades[0]
              : previousCount <= 4
                ? previousShades[1]
                : previousCount <= 6
                  ? previousShades[2]
                  : previousShades[3];

          activeDistrict.style.fill = previousFill;
          activeDistrict.style.stroke = "#718096";
          activeDistrict.style.strokeWidth = "1";
          activeDistrict.style.filter = DEFAULT_FILTER;
        }

        if (isDeselecting) {
          activeDistrict = null;
          onSelectDistrict?.(null);
          return;
        }

        activeDistrict = district;

        const clickedShades = DISTRICT_GRADIENTS[clickedDistrict] ?? [
          "#EEEEEE",
          "#DDDDDD",
          "#CCCCCC",
          "#BBBBBB",
        ];

        district.style.fill = clickedShades[3];
        district.style.stroke = "#2D4F58";
        district.style.strokeWidth = "2";
        district.style.filter = SELECTED_FILTER;

        setTooltip(null);
        onSelectDistrict?.(clickedDistrict);
      });

      district.addEventListener("mouseleave", () => {
        if (district === activeDistrict) {
          district.style.filter = SELECTED_FILTER;
          district.style.stroke = "#2D4F58";
          district.style.strokeWidth = "2";
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
    return () => {
      districts.forEach((district) => {
        const clone = district.cloneNode(true);
        district.replaceWith(clone);
      });
    };
  }, [onSelectDistrict, selectedDistrict, districtCounts, grievances]);

  return (
    /* 1. Transformed to a masonry wood-stone structure card */
    <div className="kathkuni-card bg-white p-6 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
            GEOSPATIAL COMMAND DIVISION
          </p>

          {/* Main Heading */}
          <h2 className="mt-1 text-base font-black text-[var(--devdar-forest)] uppercase tracking-tight">
            क्षेत्र निगरानी: GEOSPATIAL INCIDENT OVERVIEW
          </h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--devdar-forest)] text-white shadow-sm">
          <MapPin className="h-6 w-6" />
        </div>
      </div>

      {/* 2. Traditional Weave Geometric Divider Strip Accent */}
      <div className="mt-5 mb-5 border-t border-stone-200" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-stone-200 bg-stone-50 py-3 px-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Districts
          </p>
          <h3 className="mt-2 text-xl font-black">
            {selectedDistrict ? 1 : 12}
          </h3>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 py-3 px-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Reports
          </p>
          <h3 className="mt-2 text-xl font-black">
            {filteredGrievances.length}
          </h3>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 py-3 px-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Critical
          </p>
          <h3 className="mt-2 text-xl font-black text-red-600">
            {filteredGrievances.filter((g) => g.priority === "critical").length}
          </h3>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 py-3 px-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Selected
          </p>
          <h3 className="mt-2 text-lg font-bold">
            {selectedDistrict || "All"}
          </h3>
        </div>
      </div>

      {/* 3. Alpine Framed Interactive Map Vector Viewport */}
      <div className="relative h-[540px] rounded-2xl border border-stone-200 bg-[#F8FAFC] overflow-hidden">
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={5}
          wheel={{ step: 0.15 }}
          doubleClick={{ disabled: false }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-4 right-4 z-30 flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white/95 shadow-lg backdrop-blur-sm">
                <button
                  onClick={() => zoomIn()}
                  className="flex h-10 w-10 items-center justify-center border-b border-stone-200 transition hover:bg-stone-100"
                >
                  <Plus className="h-4 w-4" />
                </button>

                <button
                  onClick={() => zoomOut()}
                  className="flex h-10 w-10 items-center justify-center border-b border-stone-200 transition hover:bg-stone-100"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <button
                  onClick={() => resetTransform()}
                  className="flex h-10 w-10 items-center justify-center transition hover:bg-stone-100"
                  title="Reset View"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full flex items-center justify-center"
              >
                <HimachalDistricts className="max-h-full max-w-full transition-all duration-300" />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {selectedDistrict && (
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md border border-stone-200 shadow-md px-3 py-2">
              <MapPin className="h-4 w-4 text-[var(--devdar-forest)]" />

              <span className="text-sm font-semibold text-[var(--devdar-forest)]">
                {selectedDistrict}
              </span>

              <button
                onClick={() => onSelectDistrict?.(null)}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 4. Traditional Floating HUD Filter Tab */}
        <div
          className="absolute bottom-0 left-0 right-0
                border-t border-stone-200
                bg-white/90 backdrop-blur-sm
                px-8 py-4"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Low</span>

            <div
              className="flex-1 mx-2 h-1.5 rounded-full bg-gradient-to-r
                  from-[#E5ECF7]
via-[#A7BBD8]
to-[#2D4F58]"
            />

            <span className="text-slate-400">High</span>
          </div>

          <p className="mt-2 text-[10px] leading-5 text-slate-500">
            Darker shades indicate higher complaint density while preserving
            each district's cultural color palette.
          </p>
        </div>

        {tooltip && (
          <div
            className="absolute z-50 w-64 rounded-xl border border-stone-300
               bg-white/95 backdrop-blur-sm shadow-2xl
               px-4 py-3 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate3d(0,0,0)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-[var(--devdar-forest)]" />
              <h3 className="font-bold text-[15px] text-[var(--devdar-forest)]">
                {tooltip.district}
              </h3>
            </div>

            <div className="border-t border-stone-200 my-2" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Reports</span>
                <span className="font-semibold">{tooltip.total}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-red-600">Critical</span>
                <span className="font-semibold">{tooltip.critical}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-amber-600">High</span>
                <span className="font-semibold">{tooltip.high}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-green-600">Resolved</span>
                <span className="font-semibold">{tooltip.resolved}</span>
              </div>
            </div>

            <div className="border-t border-stone-200 mt-3 pt-2 text-xs text-slate-500">
              Click to filter district →
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
