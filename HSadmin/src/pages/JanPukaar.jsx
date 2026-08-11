import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

import {
  addAdminNote,
  deleteComplaint,
  getComplaint,
  listComplaints,
  markDuplicate,
  markFake,
  rejectComplaint,
  reopenComplaint,
  resolveComplaint,
  updateComplaintStatus,
  updateDepartment,
  updatePriority,
  verifyComplaint,
} from "../api/complaints";
import ComplaintTable from "../components/complaints/ComplaintTable";
import ComplaintWorkspace from "../components/complaints/ComplaintWorkspace";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import { useFetch } from "../hooks/useFetch";

const actionGroups = [
  { label: "Primary actions", types: [["verify", "Verify"], ["resolve", "Resolve"]] },
  { label: "Secondary actions", types: [["reopen", "Reopen"], ["duplicate", "Mark duplicate"], ["status", "Change status"], ["priority", "Change priority"], ["department", "Change department"], ["reject", "Reject"], ["fake", "Mark fake"]] },
  { label: "Administrative", types: [["note", "Add note"]] },
  { label: "Danger zone", types: [["delete", "Delete complaint"]], danger: true },
];

export default function JanPukaar() {
  const { data, error, loading, refresh } = useFetch(listComplaints);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [value, setValue] = useState("");
  const [detail, setDetail] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!selected) {
      return undefined;
    }
    getComplaint(selected.ticket_id).then((payload) => {
      if (active) setDetail(payload);
    }).catch(() => {
      if (active) setDetail(selected);
    });
    return () => { active = false; };
  }, [selected]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data || []).filter((ticket) => {
      const matchesStatus = status === "all" || ticket.status === status;
      const searchable = `${ticket.ticket_id} ${ticket.title} ${ticket.district} ${ticket.department}`.toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [data, query, status]);

  async function runAction() {
    if (!action?.ticket) return;
    setSaving(true);
    setActionError("");
    try {
      const ticketId = action.ticket.ticket_id;
      const note = remarks || "Updated from admin command center.";
      if (action.type === "verify") await verifyComplaint(ticketId, { isVerified: true, remarks: note });
      if (action.type === "reject") await rejectComplaint(ticketId, { remarks: note });
      if (action.type === "resolve") await resolveComplaint(ticketId, { resolutionNotes: note });
      if (action.type === "reopen") await reopenComplaint(ticketId, { remarks: note });
      if (action.type === "duplicate") await markDuplicate(ticketId, { remarks: note });
      if (action.type === "fake") await markFake(ticketId, { remarks: note });
      if (action.type === "status") await updateComplaintStatus(ticketId, value, { remarks: note });
      if (action.type === "priority") await updatePriority(ticketId, value, note);
      if (action.type === "department") await updateDepartment(ticketId, value, note);
      if (action.type === "note") await addAdminNote(ticketId, note);
      if (action.type === "delete") await deleteComplaint(ticketId);
      if (action.type !== "manage") {
        setAction(null);
        setRemarks("");
        setValue("");
        await refresh();
      }
    } catch (err) {
      setActionError(err.message || "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <Loader />;

  return (
    <div className="page-enter grid gap-4">
      {error && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{error}</p>}
      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-him-river" />
          <input className="w-full bg-transparent text-sm font-semibold outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, district, department" value={query} />
        </label>
        <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700" onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Under Verification">Under Verification</option>
          <option value="In Progress">In Progress</option>
          <option value="Verified Resolved">Verified Resolved</option>
          <option value="Reopened via Citizen Veto">Reopened via Citizen Veto</option>
        </select>
        <Button onClick={refresh} variant="secondary">Refresh</Button>
      </section>

      <ComplaintTable
        onMore={(ticket) => { setAction({ type: "manage", ticket }); setValue(ticket.status); }}
        onResolve={(ticket) => setAction({ type: "resolve", ticket })}
        onSelect={setSelected}
        onVerify={(ticket) => setAction({ type: "verify", ticket })}
        rows={rows}
      />

      {selected && (
        <Modal onClose={() => setSelected(null)} title={selected.ticket_id}>
          <ComplaintWorkspace ticket={detail || selected} />
        </Modal>
      )}

      {action && (
        <Modal onClose={() => setAction(null)} title={action.type === "manage" ? "Complaint Actions" : `${action.type} complaint`}>
          <div className="grid gap-4">
            <p className="text-sm font-bold text-slate-900">{action.ticket.title}</p>
            {action.type === "manage" ? (
              <div className="grid gap-4">
                {actionGroups.map((group) => <section className={group.danger ? "rounded-md border border-rose-200 bg-rose-50 p-3" : ""} key={group.label}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${group.danger ? "text-him-crimson" : "text-slate-500"}`}>{group.label}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.types.map(([type, label]) => <Button key={type} onClick={() => { setAction({ ...action, type }); setActionError(""); }} variant={group.danger ? "danger" : type === "verify" || type === "resolve" ? "primary" : "secondary"}>{label}</Button>)}
                  </div>
                </section>)}
              </div>
            ) : (
              <>
                {["status", "priority", "department"].includes(action.type) && (
                  <input className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-him-river" onChange={(event) => setValue(event.target.value)} placeholder={action.type === "status" ? "Pending / In Progress / Verified Resolved" : action.type === "priority" ? "low / medium / high / critical" : "Department name"} value={value} />
                )}
                <textarea className="min-h-28 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-him-river" onChange={(event) => setRemarks(event.target.value)} placeholder="Add administrative remarks" value={remarks} />
                {actionError && <p className="text-sm font-bold text-him-crimson">{actionError}</p>}
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setAction(null)} variant="secondary">Cancel</Button>
                  <Button loading={saving} onClick={runAction} variant={action.type === "delete" ? "danger" : "primary"}>
                    <ShieldCheck className="h-4 w-4" /> Confirm
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
