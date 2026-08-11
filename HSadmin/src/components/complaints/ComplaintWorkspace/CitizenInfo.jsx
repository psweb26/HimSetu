export default function CitizenInfo({ ticket }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Citizen</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{ticket?.citizenName || "Anonymous"}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{ticket?.citizenContact || "No contact shared"}</p>
    </div>
  );
}
