import StatusBadge from "../StatusBadge";

export default function StatusPanel({ ticket }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
      <div className="mt-2 flex gap-2">
        <StatusBadge value={ticket?.status} />
        <StatusBadge type="priority" value={ticket?.priority} />
      </div>
    </div>
  );
}
