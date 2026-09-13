// One-off bootstrap: creates the single Mat Log account. Idempotent.
// Usage (never in production NODE_ENV; run it with NODE_ENV=development against the prod DB):
//   EMAIL=you@example.com PASSWORD='...' npm run create-user
// If PASSWORD is omitted a random one is generated and printed ONCE to stderr.
import { randomBytes } from "node:crypto";

process.env.BOOTSTRAP = "true";
process.env.NODE_ENV = process.env.NODE_ENV === "production" ? "development" : (process.env.NODE_ENV ?? "development");

const email = process.env.EMAIL;
if (!email) {
  console.error("EMAIL is required");
  process.exit(1);
}
const name = process.env.NAME ?? email.split("@")[0];
const generated = !process.env.PASSWORD;
const password = process.env.PASSWORD ?? randomBytes(18).toString("base64url");

const { db, eq, schema } = await import("../src/db/index.ts");
const { auth } = await import("../src/auth.ts");

const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
if (existing) {
  console.error(`user ${email} already exists (${existing.id}); nothing to do`);
  process.exit(0);
}

await auth.api.signUpEmail({ body: { email, password, name } });
console.error(`created ${email}`);
if (generated) console.error(`password: ${password}`);
process.exit(0);
