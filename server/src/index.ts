import { ZodError } from "zod";
import { HTTPException } from "hono/http-exception";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "./auth.ts";
import { env } from "./env.ts";
import { requireUser, type AppEnv } from "./middleware.ts";
import { registerRoutes } from "./routes/index.ts";

const app = new Hono<AppEnv>();
app.use(logger());

app.get("/api/health", (c) => c.json({ ok: true }));
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Everything else under /api needs a signed-in user.
app.use("/api/*", requireUser);
registerRoutes(app);

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: err.issues.map(i => i.message).join("; ") }, 400);
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: err.message }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`mat-log api listening on :${info.port} (${env.NODE_ENV})`);
});
