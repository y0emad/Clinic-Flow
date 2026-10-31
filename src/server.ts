import "dotenv/config";
import { sql } from "drizzle-orm";
import app from "./app.js";
import { db, pool } from "./db/index.js";

const PORT = process.env.PORT || 3000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error(" JWT_SECRET is missing or too short (min 32 characters) in .env");
    process.exit(1);
  }
  try {
    await db.execute(sql`SELECT 1`);
    console.log(" Database connected");
    app.listen(PORT, () => console.log(` Server started on port ${PORT}`));
  } catch (err) {
    console.error(" Database connection failed:", err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

start();
