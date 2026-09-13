import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import type { Style } from "@/lib/types";
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <Alert variant="destructive">
      <AlertDescription>
        {error instanceof Error ? error.message : String(error)}
      </AlertDescription>
    </Alert>
  ) : null;
}
export function Loading() {
  return (
    <div aria-label="Cargando" className="flex flex-col gap-4">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-48 rounded-3xl" />
    </div>
  );
}
export function Blank({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function StylePicker({
  value,
  onChange,
}: {
  value: Style;
  onChange: (style: Style) => void;
}) {
  return (
    <ToggleGroup
      aria-label="Modalidad"
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as Style)}
    >
      <ToggleGroupItem value="gi">Gi</ToggleGroupItem>
      <ToggleGroupItem value="nogi">No-gi</ToggleGroupItem>
    </ToggleGroup>
  );
}
