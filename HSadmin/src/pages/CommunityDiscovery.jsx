import { useMemo, useState } from "react";
import { Eye, EyeOff, FileImage, MessageCircle, Pin, Trash2, TrendingUp, UsersRound } from "lucide-react";

import { deleteIncident, getCommunityIncident, hideIncident, listCommunity, pinIncident } from "../api/community";
import ComplaintCard from "../components/complaints/ComplaintCard";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import { useFetch } from "../hooks/useFetch";

export default function CommunityDiscovery() {
  const { data, error, loading, refresh } = useFetch(listCommunity);
  const [selected, setSelected] = useState(null);
  const [actionError, setActionError] = useState("");
  const metrics = useMemo(() => ({
    reports: (data || []).length,
    support: (data || []).reduce((total, incident) => total + Number(incident.support_count || 0), 0),
    comments: (data || []).reduce((total, incident) => total + Number(incident.comment_count || incident.comments?.length || 0), 0),
    evidence: (data || []).reduce((total, incident) => total + Number(incident.evidence_count || incident.evidence?.length || 0), 0),
  }), [data]);

  if (loading && !data) return <Loader label="Loading community signals" />;

  async function selectIncident(incident) {
    try {
      setSelected(await getCommunityIncident(incident.incident_id));
    } catch (err) {
      setActionError(err.message || "Unable to load incident detail.");
    }
  }

  async function moderate(action) {
    setActionError("");
    try {
      if (action === "pin") await pinIncident(selected.incident_id);
      if (action === "hide") await hideIncident(selected.incident_id);
      if (action === "delete") await deleteIncident(selected.incident_id);
      setSelected(null);
      await refresh();
    } catch (err) {
      setActionError(err.message || "Moderation failed.");
    }
  }

  return (
    <div className="page-enter grid gap-4">
      {error && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{error}</p>}
      {actionError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-him-crimson">{actionError}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SignalMetric icon={TrendingUp} label="Trending reports" tone="text-him-river" value={metrics.reports} />
        <SignalMetric icon={UsersRound} label="Community support" tone="text-him-pine" value={metrics.support} />
        <SignalMetric icon={MessageCircle} label="Conversation" tone="text-him-marigold" value={metrics.comments} />
        <SignalMetric icon={FileImage} label="Evidence items" tone="text-him-crimson" value={metrics.evidence} />
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-him-river">Public signal monitoring</p><h2 className="mt-1 text-lg font-black text-slate-950">Community reports requiring moderation</h2></div><Button onClick={refresh} variant="secondary">Refresh signals</Button></div></section>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {(data || []).map((incident) => <div className="command-card rounded-md" key={incident.incident_id}><ComplaintCard onClick={() => selectIncident(incident)} ticket={{ ...incident, upvotes: incident.support_count }} /></div>)}
      </div>
      {selected && <Modal onClose={() => setSelected(null)} title="Community incident"><div className="grid gap-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-him-river">{selected.ticket_id || selected.incident_id}</p><h3 className="mt-1 text-lg font-black text-slate-950">{selected.title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600">{selected.description || "No description provided."}</p></div><div className="grid grid-cols-3 gap-2"><DetailMetric label="Support" value={selected.support_count || 0} /><DetailMetric label="Comments" value={(selected.comments || []).length} /><DetailMetric label="Evidence" value={(selected.evidence || []).length} /></div><div className="flex flex-wrap gap-2"><Button onClick={() => moderate("pin")} variant="secondary"><Pin className="h-4 w-4" /> Pin</Button><Button onClick={() => moderate("hide")} variant="secondary"><EyeOff className="h-4 w-4" /> Hide</Button><Button onClick={() => moderate("delete")} variant="danger"><Trash2 className="h-4 w-4" /> Delete</Button><Button onClick={() => setSelected(null)} variant="secondary"><Eye className="h-4 w-4" /> Close</Button></div></div></Modal>}
    </div>
  );
}

function SignalMetric({ icon: Icon, label, value, tone }) { return <article className="command-card rounded-md border border-slate-200 bg-white p-4 shadow-sm"><Icon className={`h-4 w-4 ${tone}`} /><p className="mt-3 text-xl font-black tabular-nums text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></article>; }
function DetailMetric({ label, value }) { return <div className="rounded-md bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-base font-black text-slate-950">{value}</p></div>; }
