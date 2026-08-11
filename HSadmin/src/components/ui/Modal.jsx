import { X } from "lucide-react";

export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-4">
      <section className="w-full max-w-2xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-command motion-safe:animate-[command-enter_180ms_ease-out]">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-him-pine">{title}</h2>
          <button
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="app-scrollbar max-h-[calc(100dvh-8rem)] overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}
