import { z } from "zod";

// Local dev reads server/.env; in Docker the variables come from compose and the file does not exist.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url).pathname);
} catch {
  /* no .env file: rely on the process environment */
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 chars"),
  /** Public origin of the app, e.g. https://bjj.vmoon.tech or http://localhost:5179 */
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(10),
  COACH_MODEL: z.string().default("gemini-3.5-flash"),
  /** Only honoured outside production: lets scripts/create-user.ts sign up the single user. */
  BOOTSTRAP: z.string().optional(),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
