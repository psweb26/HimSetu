import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DashboardStats from "../components/dashboard/DashboardStats";
import HimachalMap from "../components/dashboard/HimachalMap";
import PendingQueue from "../components/dashboard/PendingQueue";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";
import SituationPanel from "../components/dashboard/SituationPanel";
import Loader from "../components/ui/Loader";
import { getSummary } from "../api/dashboard";
import { useFetch } from "../hooks/useFetch";
import { useLiveRefresh } from "../hooks/useLiveRefresh";

export default function Dashboard() {
  const { data, error, loading, refresh } = useFetch(getSummary, []);
  useLiveRefresh(refresh);

  if (loading && !data) return <Loader />;

  return (
    <div className="page-enter grid gap-5">
      {error && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{error}</p>}
      <SituationPanel alerts={data?.alerts} generatedAt={data?.generated_at} transit={data?.transit} weather={data?.weather} />
      <DashboardStats metrics={data?.metrics} />

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <HimachalMap districtLoad={data?.district_load} transit={data?.transit} weather={data?.weather} />
        <section className="command-card rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-him-river">Load analytics</p>
          <h3 className="mt-1 text-sm font-black text-slate-950">District workload and criticality</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">Compare complaint volume with critical tickets by district.</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={data?.district_load || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="district" fontSize={10} interval={0} tick={{ width: 54 }} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="total" fill="#256f8f" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="critical" fill="#8f2134" name="Critical" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <QuickActions onRefresh={refresh} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PendingQueue grievances={data?.grievances || []} />
        <div className="grid gap-5"><RecentActivity alerts={data?.alerts || []} /><QuickActions onRefresh={refresh} /></div>
      </div>
    </div>
  );
}
