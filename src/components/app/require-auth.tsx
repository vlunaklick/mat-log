import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import LoginPage from "@/features/auth/LoginPage";
import { Spinner } from "@/components/ui/spinner";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
