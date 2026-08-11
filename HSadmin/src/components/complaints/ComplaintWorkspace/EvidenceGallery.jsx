import { getApiUrl } from "../../../api/client";

export default function EvidenceGallery({ count = 0, evidence = [] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evidence</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{count} records attached</p>
      {evidence.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{evidence.map((item) => {
        const url = item.image_url || item.url;
  return url ? <img alt={item.description || "Complaint evidence"} className="aspect-video w-full rounded-md object-cover" key={item.id} src={url.startsWith("http") ? url : getApiUrl(url)} /> : null;
      })}</div>}
    </div>
  );
}
