import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sql } from "drizzle-orm";
import { db } from "./db/index.js";
import authRoutes from "./Routes/authRoutes.js";
import userRoutes from "./Routes/userRoutes.js";
import { errorHandler, notFound } from "./Middleware/errorHandler.js";
import servicesRoutes from "./Routes/servicesRoutes.js";
import scheduleRoutes from "./Routes/scheduleRoutes.js";
import availabilityRoutes from "./Routes/availabilityRoutes.js";
import appointmentRoutes from "./Routes/appointmentRoutes.js";

// The Express app only (no listen), so tests can use it with Supertest.
const app = express();
// Behind a reverse proxy (Caddy) every request comes from the proxy, so trust the one proxy's
// X-Forwarded-For: rate limits then count real visitors. Off by default, since without a proxy
// a client could fake that header to dodge the limits.
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
// helmet's CSP tells the browser to load every file over https ("upgrade-insecure-requests").
// That leaves a blank page on plain http, so it's only on when the site is served over HTTPS.
const httpsOnly = process.env.HTTPS_ONLY === "true";
app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: httpsOnly ? [] : null } } }));
// Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173,https://clinicflow.app"
// (only needed when the frontend runs on another origin; the built frontend is served from here).
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:5173").split(",").map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Used by Docker / the hosting platform to check the API and the database are up.
app.get("/health", async (_req, res) => {
  await db.execute(sql`SELECT 1`);
  res.json({ success: true, status: "ok" });
});

// All API routes live under /api, so they never clash with the frontend's pages.
const api = express.Router();
api.use("/auth", authRoutes);
api.use("/users", userRoutes);
api.use("/services", servicesRoutes);
api.use("/schedule", scheduleRoutes);
api.use("/availability", availabilityRoutes);
api.use("/appointments", appointmentRoutes);
api.use(notFound); // unknown /api/... → JSON 404, not the frontend
app.use("/api", api);

// The built React app (client/dist), when it exists: in Docker / production.
// Any other GET returns index.html, so the frontend's router handles the URL (/dashboard, /book/...).
const clientDist = path.resolve(process.env.CLIENT_DIST ?? "client/dist");
if (existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use(notFound);
app.use(errorHandler);

export default app;
