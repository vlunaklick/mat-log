import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.ts";

await migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
console.log("migrations applied");
process.exit(0);
