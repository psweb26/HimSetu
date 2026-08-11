import { Inbox } from "lucide-react";

export default function EmptyState({ title = "No records found", detail = "Try changing filters or refreshing data." }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-md border border-dashed border-slate-300 bg-white/70 p-6 text-center">
      <div>
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-slate-50 text-him-pine">
          <Inbox className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 max-w-sm text-xs font-medium text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
