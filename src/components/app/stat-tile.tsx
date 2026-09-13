import { cn } from "@/lib/utils";

/** Level-1 tint tile for a single number. `highlight` is the one brand-blue slot per screen. */
export function StatTile({ label, value, hint, highlight, className }: { label: string; value: string | number; hint?: string; highlight?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-3xl p-5", highlight ? "bg-brand text-brand-foreground" : "bg-surface text-surface-foreground", className)}>
      <span className={cn("text-label", highlight ? "text-brand-foreground/80" : "text-muted-foreground")}>{label}</span>
      <span className="text-h2 tabular-nums [overflow-wrap:anywhere]">{value}</span>
      {hint ? <span className={cn("text-sm", highlight ? "text-brand-foreground/80" : "text-muted-foreground")}>{hint}</span> : null}
    </div>
  );
}
