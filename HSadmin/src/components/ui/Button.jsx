import { Loader2 } from "lucide-react";

import { cx } from "../../utils/format";

const variants = {
  primary: "bg-him-pine text-white hover:bg-[#102920]",
  secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
  danger: "bg-him-crimson text-white hover:bg-[#74182a]",
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
  ...props
}) {
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-black uppercase tracking-wide transition",
        variants[variant],
        (disabled || loading) && "opacity-60",
        className,
      )}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
