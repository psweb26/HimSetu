import {
  Activity,
  Building2,
  Gauge,
  Landmark,
  LayoutDashboard,
  Map,
  MessageSquareWarning,
  Settings,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { NAV_ITEMS } from "../../utils/constants";
import { cx } from "../../utils/format";

const icons = {
  Dashboard: LayoutDashboard,
  "Jan Pukaar": MessageSquareWarning,
  Operations: Activity,
  Community: Gauge,
  Heritage: Landmark,
  Locations: Map,
  Users,
  Settings,
};

export default function Sidebar() {
  return (
    <aside className="hidden h-dvh w-72 shrink-0 border-r border-slate-200 bg-white/90 lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-him-pine text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-him-marigold">
                HimSetu
              </p>
              <h1 className="text-sm font-black uppercase tracking-wide text-him-pine">
                Admin Command
              </h1>
            </div>
          </div>
        </div>

        <nav className="app-scrollbar grid min-h-0 flex-1 gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = icons[item.label] || LayoutDashboard;
            return (
              <NavLink
                className={({ isActive }) =>
                  cx(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition duration-200",
                    isActive
                      ? "bg-him-pine text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  )
                }
                end={item.path === "/"}
                key={item.path}
                to={item.path}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
              Docker Ready
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-emerald-900">
              Admin runs as a frontend client of the shared HimSetu backend.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
