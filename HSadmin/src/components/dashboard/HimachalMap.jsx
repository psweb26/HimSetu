import { Layers3, MapPin } from "lucide-react";

const positions = {
  Chamba: [33, 27], Kangra: [43, 39], Kullu: [53, 31], Mandi: [56, 48],
  Shimla: [67, 59], Kinnaur: [79, 39], Solan: [64, 68], Sirmaur: [73, 75],
  Una: [32, 56], Bilaspur: [47, 60], Hamirpur: [42, 51], "Lahaul & Spiti": [66, 19],
};

export default function HimachalMap({ districtLoad = [], weather = [], transit = [] }) {
  const weatherDistricts = new Set(weather.filter((station) => station.dashboard_status !== "Normal").map((station) => station.district));
  const transitDistricts = new Set(transit.filter((route) => route.is_closed).flatMap((route) => [route.origin, route.destination]));

  return (
    <section className="command-card overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-him-river"><MapPin className="h-3.5 w-3.5" /> Geospatial watch</p>
          <h3 className="mt-1 text-sm font-black text-slate-950">Himachal operational map</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">District pins reflect current complaint load and reported hazards.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600"><Layers3 className="h-3 w-3" /> Live layers</span>
      </div>
      <div className="relative mx-4 mb-4 min-h-80 overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-[#e9f3ef] via-[#f8fbfa] to-[#dcecf4]">
        <svg aria-label="Stylised Himachal Pradesh district operational map" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          <path d="M44 4 L61 10 L72 21 L89 31 L82 44 L86 55 L77 67 L81 82 L67 94 L55 87 L46 91 L35 79 L23 70 L26 56 L17 43 L25 31 L31 18 Z" fill="#d4e7dd" stroke="#256f8f" strokeWidth="1.1" />
          <path d="M35 20 L48 28 L43 46 L27 52 M49 12 L57 33 L72 22 M43 46 L59 51 L72 43 M27 52 L43 63 L38 76 M43 63 L58 69 L67 94 M59 51 L75 60 L67 94" fill="none" stroke="#9dc5b4" strokeWidth="0.55" />
          {districtLoad.map((item) => {
            const position = positions[item.district];
            if (!position) return null;
            const [x, y] = position;
            const critical = item.critical > 0 || weatherDistricts.has(item.district) || transitDistricts.has(item.district);
            return <g key={item.district}><circle cx={x} cy={y} fill={critical ? "#8f2134" : "#256f8f"} r={critical ? "3.5" : "2.7"} stroke="white" strokeWidth="1.2" /><text fill="#17212b" fontSize="3" fontWeight="700" textAnchor="middle" x={x} y={y + 6}>{item.district}</text></g>;
          })}
        </svg>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-700"><span className="rounded-full bg-white/90 px-2 py-1"><i className="mr-1 inline-block h-2 w-2 rounded-full bg-him-river" />Complaint load</span><span className="rounded-full bg-white/90 px-2 py-1"><i className="mr-1 inline-block h-2 w-2 rounded-full bg-him-crimson" />Alert / critical</span></div>
      </div>
    </section>
  );
}
