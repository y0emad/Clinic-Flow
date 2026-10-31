import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { DateTime } from "luxon";
import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { appointments, services, timeOff, users, workingHours, type Appointment } from "../src/db/schema.js";
import { hashNumber } from "../src/Middleware/middleWare.js";
import { CLINIC_TZ } from "../src/utils/slots.js";

export const api = () => request(app);

export const PASSWORD = "secret123";

export async function resetDb() {
  await db.execute(sql`TRUNCATE appointments, time_off, working_hours, services, users CASCADE`);
}

type Role = "DOCTOR" | "PATIENT";

// A verified user created straight in the DB (skips signup + OTP).
export async function createUser(role: Role = "PATIENT", overrides: Partial<typeof users.$inferInsert> = {}) {
  const [user] = await db
    .insert(users)
    .values({
      name: role === "DOCTOR" ? "Dr. Test" : "Test Patient",
      email: `${role.toLowerCase()}-${randomUUID()}@example.test`,
      password: await hashNumber(PASSWORD),
      verified: true,
      role,
      ...overrides,
    })
    .returning();
  return user;
}

export const tokenFor = (u: { id: string; email: string; role: Role }) =>
  jwt.sign({ userId: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET!);

export const auth = (u: { id: string; email: string; role: Role }) => ({ Authorization: `Bearer ${tokenFor(u)}` });

export async function createService(overrides: Partial<typeof services.$inferInsert> = {}) {
  const [service] = await db
    .insert(services)
    .values({ name: `Consultation ${randomUUID().slice(0, 8)}`, durationMinutes: 30, price: 200, ...overrides })
    .returning();
  return service;
}

// Clinic open every day 09:00-17:00, so any future day has free slots.
export async function openAllWeek() {
  await db.insert(workingHours).values(
    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "17:00" })),
  );
}

export async function addTimeOff(startAt: Date, endAt: Date) {
  await db.insert(timeOff).values({ startAt, endAt, reason: "test" });
}

// Dates in the clinic's timezone, relative to today (dates are never hard-coded, so tests don't expire).
export const clinicDay = (daysFromToday: number) => DateTime.now().setZone(CLINIC_TZ).plus({ days: daysFromToday }).startOf("day");
export const dayString = (daysFromToday: number) => clinicDay(daysFromToday).toISODate()!;

export async function getSlots(serviceId: string, date: string) {
  const res = await api().get(`/api/availability/${serviceId}?date=${date}`);
  return res.body.slots as { startAt: string; endAt: string; time: string }[];
}

export function book(patient: Awaited<ReturnType<typeof createUser>>, serviceId: string, startAt: string) {
  return api().post("/api/appointments").set(auth(patient)).send({ serviceId, startAt });
}

// Insert an appointment directly, for times the API wouldn't allow (past, or very soon).
export async function insertAppointment(
  patientId: string,
  serviceId: string,
  startAt: Date,
  status: Appointment["status"] = "BOOKED",
) {
  const [row] = await db
    .insert(appointments)
    .values({ patientId, serviceId, startAt, endAt: new Date(startAt.getTime() + 30 * 60_000), price: 200, status })
    .returning();
  return row;
}
