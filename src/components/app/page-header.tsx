import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  lead,
  action,
  back,
}: {
  title: string;
  lead?: ReactNode;
  action?: ReactNode;
  /** Link shown above the title on detail and editor pages. */
  back?: { to: string; label: string };
}) {
  return (
    <header className="flex flex-col gap-3">
      {back ? (
        <Link to={back.to} className="-ml-1 flex w-fit items-center gap-1 rounded-full py-1 pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-h2 md:text-h1">{title}</h1>
          {lead ? <p className="text-muted-foreground first-letter:uppercase">{lead}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
