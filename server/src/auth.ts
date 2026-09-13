import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "./db/index.ts";
import { env, isProd } from "./env.ts";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL, ...(env.TRUSTED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [])],
  emailAndPassword: {
    enabled: true,
    // Single-user app: sign-up is closed. scripts/create-user.ts sets BOOTSTRAP=true
    // for one run (never honoured in production) to create the only account.
    disableSignUp: isProd || env.BOOTSTRAP !== "true",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

export type Auth = typeof auth;
