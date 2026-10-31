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
app.use(helmet());
// Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173,https://clinicflow.app"
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:5173").split(",").map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Used by Docker / the hosting platform to check the API and the database are up.
app.get("/health", async (_req, res) => {
  await db.execute(sql`SELECT 1`);
  res.json({ success: true, status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/services", servicesRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/availability", availabilityRoutes);
app.use("/appointments", appointmentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
