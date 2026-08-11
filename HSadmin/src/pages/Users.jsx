import { useCallback, useMemo, useState } from "react";
import { BadgeCheck, Building2, ShieldCheck, UserRound, UserX, UsersRound } from "lucide-react";

import { activateUser, deleteUser, listUsers, suspendUser } from "../api/users";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { useFetch } from "../hooks/useFetch";

export default function Users() {
  const [userType, setUserType] = useState("citizen");
  const loader = useCallback(() => listUsers({ user_type: userType }), [userType]);
  const overviewLoader = useCallback(() => Promise.all([listUsers({ user_type: "citizen" }), listUsers({ user_type: "officer" })]), []);
  const { data, error, loading, refresh } = useFetch(loader);
  const { data: overview, error: overviewError, refresh: refreshOverview } = useFetch(overviewLoader);
  const [actionError, setActionError] = useState("");
  const metrics = useMemo(() => {
    if (!overview) return { citizens: "—", officers: "—", active: "—", suspended: "—" };
    const [citizens = [], officers = []] = overview || [];
    const users = [...citizens, ...officers];
    return { citizens: citizens.length, officers: officers.length, active: users.filter((user) => user.is_active).length, suspended: users.filter((user) => !user.is_active).length };
  }, [overview]);

  if (loading && !data) return <Loader label="Loading user and officer records" />;

  async function act(action, user) {
    setActionError("");
    try {
      if (action === "suspend") await suspendUser(user.id, user.type);
      if (action === "activate") await activateUser(user.id, user.type);
      if (action === "delete") await deleteUser(user.id, user.type);
      await Promise.all([refresh(), refreshOverview()]);
    } catch (err) {
      setActionError(err.message || "User action failed.");
    }
  }

  return <div className="page-enter grid gap-4"><section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div><p className="text-[10px] font-black uppercase tracking-widest text-him-river">Identity and permissions</p><h2 className="mt-1 text-lg font-black text-slate-950">Shared HimSetu accounts</h2></div><div className="flex gap-2"><select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold" onChange={(event) => setUserType(event.target.value)} value={userType}><option value="citizen">Citizens</option><option value="officer">Officers</option></select><Button onClick={() => Promise.all([refresh(), refreshOverview()])} variant="secondary">Refresh</Button></div></section><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><OverviewMetric icon={UsersRound} label="Citizens" tone="text-him-river" value={metrics.citizens} /><OverviewMetric icon={ShieldCheck} label="Officers" tone="text-him-pine" value={metrics.officers} /><OverviewMetric icon={BadgeCheck} label="Active accounts" tone="text-emerald-700" value={metrics.active} /><OverviewMetric icon={UserX} label="Suspended" tone="text-him-crimson" value={metrics.suspended} /></section>{(error || overviewError) && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{error || overviewError}</p>}{actionError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-him-crimson">{actionError}</p>}<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{userType} directory</p><div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{(data || []).map((user) => <article className="command-card rounded-md border border-slate-200 p-4" key={`${user.type}-${user.id}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-him-river">{user.type} / {user.role || "standard access"}</p><h3 className="mt-1 text-base font-black text-slate-950">{user.name}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{user.email || user.phone || "No contact"}</p></div><UserRound className="h-5 w-5 text-him-pine" /></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-700"><Metric label="Reports" value={user.report_count} /><Metric label="Comments" value={user.comment_count} /><Metric label="Evidence" value={user.evidence_count} /><Metric label="Trust" value={user.trust_score ?? "N/A"} /></div><p className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-500"><Building2 className="h-3.5 w-3.5" /> {user.department || "Department not assigned"}</p><p className="mt-1 text-xs font-semibold text-slate-500">Last active: {user.last_active || "Not recorded"}</p><div className="mt-4 flex flex-wrap gap-2"><Button className="h-8 px-2" onClick={() => act(user.is_active ? "suspend" : "activate", user)} variant="secondary"><UserX className="h-3.5 w-3.5" /> {user.is_active ? "Suspend" : "Activate"}</Button><Button className="h-8 px-2" onClick={() => act("delete", user)} variant="danger">Delete</Button></div></article>)}</div></section></div>;
}

function OverviewMetric({ icon: Icon, label, value, tone }) { return <article className="command-card rounded-md border border-slate-200 bg-white p-4 shadow-sm"><Icon className={`h-4 w-4 ${tone}`} /><p className="mt-3 text-xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></article>; }
function Metric({ label, value }) { return <div className="rounded-md bg-slate-50 p-2"><p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-base text-slate-950">{value ?? 0}</p></div>; }
