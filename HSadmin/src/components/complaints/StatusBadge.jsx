import { getPriorityTone, getStatusTone } from "../../utils/status";
import { cx } from "../../utils/format";

export default function StatusBadge({ value, type = "status" }) {
  const tone = type === "priority" ? getPriorityTone(value) : getStatusTone(value);
  return (
    <span className={cx("inline-flex rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide", tone)}>
      {value || "Pending"}
    </span>
  );
}
