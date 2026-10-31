import { pgEnum, pgTable, text, timestamp, uuid, varchar,boolean, integer, uniqueIndex, time, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const roleEnum = pgEnum("role", ["DOCTOR", "PATIENT"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["BOOKED", "CANCELLED", "COMPLETED", "NO_SHOW"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: text("password").notNull(),
  verified: boolean("verified").notNull().default(false),
  otp: text("otp"),
  timeOtp: timestamp("time_otp", { withTimezone: true }),
  otpAttempts: integer("otp_attempts").notNull().default(0),
  role: roleEnum("role").notNull().default("PATIENT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});


export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  price: integer("price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
 
  uniqueIndex("services_name_active_unique")
    .on(sql`lower(${t.name})`)
    .where(sql`${t.isActive} = true`),
]);

export const workingHours = pgTable("working_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayOfWeek: integer("day_of_week").notNull().unique(), // 0 = Sunday ... 6 = Saturday (like Date.getDay())
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  check("working_hours_end_after_start", sql`${t.endTime} > ${t.startTime}`),
  check("working_hours_valid_day", sql`${t.dayOfWeek} BETWEEN 0 AND 6`),
]);


export const timeOff = pgTable("time_off", {
  id: uuid("id").primaryKey().defaultRandom(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("time_off_end_after_start", sql`${t.endAt} > ${t.startAt}`),
]);
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "restrict" }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(), // startAt + service duration
  price: integer("price").notNull(), // service price at booking time
  status: appointmentStatusEnum("status").notNull().default("BOOKED"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  check("appointments_end_after_start", sql`${t.endAt} > ${t.startAt}`),
  index("appointments_start_at_idx").on(t.startAt),
  index("appointments_patient_id_idx").on(t.patientId),
]);





export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WorkingHours = typeof workingHours.$inferSelect;
export type NewWorkingHours = typeof workingHours.$inferInsert;
export type TimeOff = typeof timeOff.$inferSelect;
export type NewTimeOff = typeof timeOff.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
