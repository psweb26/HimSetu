import { Loader2 } from "lucide-react";

export default function Loader({ label = "Loading command data" }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-md border border-dashed border-slate-300 bg-white/70">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-him-river" />
        {label}
      </div>
    </div>
  );
}
