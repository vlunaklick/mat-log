import type { MiddlewareHandler } from "hono";
import { auth } from "./auth.ts";

export type AppEnv = {
  Variables: {
    userId: string;
    userEmail: string;
  };
};

/** Rejects with 401 unless a valid Better Auth session cookie is present. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", session.user.id);
  c.set("userEmail", session.user.email);
  await next();
};
