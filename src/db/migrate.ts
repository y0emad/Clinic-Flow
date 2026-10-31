import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index.js";

// Applies the SQL files in ./drizzle. Used in production / Docker, where drizzle-kit (a dev tool) isn't installed.
try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(" Migrations applied");
} catch (err) {
  console.error(" Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
