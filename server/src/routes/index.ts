import { audioRoute } from "./audio.ts";
import { catalogRoute } from "./catalog.ts";
import { trainingRoute } from "./training.ts";
import type { Hono } from "hono";
import type { AppEnv } from "../middleware.ts";
import { backupRoute } from "./backup.ts";
import { chatRoute } from "./chat.ts";
import { sessionsRoute } from "./sessions.ts";
import { settingsRoute } from "./settings.ts";
import { techniquesRoute } from "./techniques.ts";

/** Mount every /api resource here. Each route file exports a Hono sub-app. */
export function registerRoutes(app: Hono<AppEnv>): void {
  app.route("/api/audio", audioRoute);
  app.route("/api/catalog", catalogRoute);
  app.route("/api/training", trainingRoute);
  app.route("/api/sessions", sessionsRoute);
  app.route("/api/techniques", techniquesRoute);
  app.route("/api/settings", settingsRoute);
  app.route("/api", chatRoute);
  app.route("/api", backupRoute);
}
