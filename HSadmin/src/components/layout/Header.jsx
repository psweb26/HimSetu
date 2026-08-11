import { LogOut, RefreshCcw, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { NAV_ITEMS } from "../../utils/constants";
import Button from "../ui/Button";

export default function Header({ title, subtitle, onRefresh, loading }) {
  const { logout, user } = useAuth();

  return (
    <header className="z-30 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-him-river">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="signal-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {user?.role || "Command Center"} / Live operations
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
            {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button loading={loading} onClick={onRefresh} variant="secondary">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            )}
            <Button onClick={logout} variant="secondary">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `shrink-0 rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide ${
                  isActive ? "bg-him-pine text-white" : "bg-slate-100 text-slate-700"
                }`
              }
              end={item.path === "/"}
              key={item.path}
              to={item.path}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
