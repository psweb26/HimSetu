import { Outlet, useLocation } from "react-router-dom";

import { NAV_ITEMS } from "../../utils/constants";
import Header from "./Header";
import Sidebar from "./Sidebar";

const pageMeta = {
  "/": {
    title: "Executive Dashboard",
    subtitle: "Operational overview for grievances, alerts, telemetry, and cultural assets.",
  },
  "/jan-pukaar": {
    title: "Jan Pukaar Queue",
    subtitle: "Verify, prioritize, and resolve citizen infrastructure complaints.",
  },
  "/operations": {
    title: "Operations Telemetry",
    subtitle: "Weather stations, transit routes, and active route risk indicators.",
  },
  "/community": {
    title: "Community Discovery",
    subtitle: "High-signal community reports and public upvote patterns.",
  },
  "/heritage": {
    title: "Heritage Registry",
    subtitle: "Cultural records visible to the citizen-facing experience.",
  },
  "/locations": {
    title: "Location Manager",
    subtitle: "District distribution and service-load monitoring.",
  },
  "/users": {
    title: "Users and Officers",
    subtitle: "Administrative operator view for departments and field ownership.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Container endpoints, API health, and local admin configuration.",
  },
};

export default function AdminShell() {
  const location = useLocation();
  const exactPath = NAV_ITEMS.some((item) => item.path === location.pathname)
    ? location.pathname
    : "/";
  const meta = pageMeta[exactPath] || pageMeta["/"];

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="app-scrollbar min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
