import type { Request, Response } from "express";
import { matchedData } from "express-validator";
import { appointments, services, users, type Appointment } from "../db/schema.js";
import { db } from "../db/index.js";
import { and, asc, count, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { AppError } from "../utils/AppError.js";
import { DateTime } from "luxon";
import { CLINIC_TZ, getAvailableSlots } from "../utils/slots.js";
import { sendBookingConfirmationEmail, sendCancellationEmail } from "../utils/sendEmail.js";

const MAX_UPCOMING_BOOKINGS = 3;

const appointmentFields = {
  id: appointments.id,
  serviceId: appointments.serviceId,
  startAt: appointments.startAt,
  endAt: appointments.endAt,
  price: appointments.price,
  status: appointments.status,
  notes: appointments.notes,
};

export async function CreateAppointment(req: Request, res: Response) {
  const { serviceId, startAt, notes } = req.body;
  const patientId = req.user!.userId;

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.isActive, true)))
    .limit(1);
  if (!service) {
    throw new AppError(404, "service not found");
  }

  const start = DateTime.fromJSDate(startAt).setZone(CLINIC_TZ);
  const date = start.toISODate(); // "2026-11-07"
  if (start > DateTime.now().plus({ days: 60 })) {
    throw new AppError(400, "you can't book further than 60 days");
  }

  const upcoming = await db
    .select({ startAt: appointments.startAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        eq(appointments.status, "BOOKED"),
        gte(appointments.startAt, new Date()),
      ),
    );
  if (upcoming.length >= MAX_UPCOMING_BOOKINGS) {
    throw new AppError(409, `You can't have more than ${MAX_UPCOMING_BOOKINGS} upcoming appointments`);
  }
  if (upcoming.some((a) => DateTime.fromJSDate(a.startAt).setZone(CLINIC_TZ).toISODate() === date)) {
    throw new AppError(409, "You already have an appointment on this day");
  }

  const { slots } = await getAvailableSlots(service.durationMinutes, date!);
  const slot = slots.find((s) => s.start.toMillis() === startAt.getTime());
  if (!slot) throw new AppError(409, "This time slot is not available");

  const [appointment] = await db
    .insert(appointments)
    .values({
      patientId,
      serviceId: service.id,
      startAt: slot.start.toJSDate(),
      endAt: slot.end.toJSDate(),
      price: service.price,
      notes,
    })
    .returning(appointmentFields);

  const [patient] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, patientId));
  void sendBookingConfirmationEmail(patient.email, {
    patientName: patient.name,
    serviceName: service.name,
    startAt: appointment.startAt,
  });

  res
    .status(201)
    .json({ success: true, msg: "Appointment booked", appointment });
}

function paginationInfo(page: number, limit: number, totalItems: number) {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    currentPage: page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export async function GetMyAppointments(req: Request, res: Response) {
  const { status, page, limit } = matchedData(req, { locations: ["query"] });
  const conditions = [eq(appointments.patientId, req.user!.userId)];
  if (status) conditions.push(eq(appointments.status, status));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: appointments.id,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        price: appointments.price,
        status: appointments.status,
        notes: appointments.notes,
        service: { id: services.id, name: services.name },
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.startAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(appointments).where(and(...conditions)),
  ]);

  res.json({ success: true, appointments: rows, pagination: paginationInfo(page, limit, total) });
}

export async function GetAllAppointments(req: Request, res: Response) {
  const { status, date, page, limit } = matchedData(req, { locations: ["query"] });
  const conditions: SQL[] = [];

  if (status) conditions.push(eq(appointments.status, status));

  if (date) {
    const day = DateTime.fromISO(date, { zone: CLINIC_TZ });
    conditions.push(gte(appointments.startAt, day.startOf("day").toJSDate()));
    conditions.push(lte(appointments.startAt, day.endOf("day").toJSDate()));
  } else {
    conditions.push(gte(appointments.startAt, new Date()));
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: appointments.id,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        price: appointments.price,
        status: appointments.status,
        notes: appointments.notes,
        service: { id: services.id, name: services.name },
        patient: { id: users.id, name: users.name, phone: users.phone, email: users.email },
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(and(...conditions))
      .orderBy(asc(appointments.startAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(appointments).where(and(...conditions)),
  ]);

  res.json({ success: true, appointments: rows, pagination: paginationInfo(page, limit, total) });
}

// Doctor dashboard numbers, all counted by Postgres in one query (count ... FILTER).
export async function GetAppointmentStats(_req: Request, res: Response) {
  const now = DateTime.now().setZone(CLINIC_TZ);
  const todayStart = now.startOf("day").toJSDate().toISOString();
  const todayEnd = now.endOf("day").toJSDate().toISOString();
  const monthStart = now.startOf("month").toJSDate().toISOString();
  const monthEnd = now.endOf("month").toJSDate().toISOString();
  const nowIso = now.toJSDate().toISOString();

  const inToday = sql`${appointments.startAt} between ${todayStart} and ${todayEnd}`;
  const inMonth = sql`${appointments.startAt} between ${monthStart} and ${monthEnd}`;
  const countWhere = (condition: SQL) => sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

  const [stats] = await db
    .select({
      today: countWhere(sql`${inToday} and ${appointments.status} <> 'CANCELLED'`),
      todayRemaining: countWhere(sql`${inToday} and ${appointments.status} = 'BOOKED' and ${appointments.startAt} > ${nowIso}`),
      upcoming: countWhere(sql`${appointments.status} = 'BOOKED' and ${appointments.startAt} > ${nowIso}`),
      monthCompleted: countWhere(sql`${inMonth} and ${appointments.status} = 'COMPLETED'`),
      monthNoShow: countWhere(sql`${inMonth} and ${appointments.status} = 'NO_SHOW'`),
      monthCancelled: countWhere(sql`${inMonth} and ${appointments.status} = 'CANCELLED'`),
      monthRevenue: sql<number>`coalesce(sum(${appointments.price}) filter (where ${inMonth} and ${appointments.status} = 'COMPLETED'), 0)`.mapWith(Number),
    })
    .from(appointments);

  const attended = stats.monthCompleted + stats.monthNoShow;

  res.json({
    success: true,
    stats: {
      today: { total: stats.today, remaining: stats.todayRemaining },
      upcoming: stats.upcoming,
      thisMonth: {
        completed: stats.monthCompleted,
        noShow: stats.monthNoShow,
        cancelled: stats.monthCancelled,
        revenue: stats.monthRevenue,
        // % of finished appointments where the patient didn't come (null if none yet).
        noShowRate: attended === 0 ? null : Math.round((stats.monthNoShow / attended) * 100),
      },
    },
  });
}

const CANCEL_NOTICE_HOURS = 2;

export async function CancelAppointment(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const user = req.user!;
  const isDoctor = user.role === "DOCTOR";

  const [appointment] = await db
    .select({
      patientId: appointments.patientId,
      startAt: appointments.startAt,
      status: appointments.status,
      serviceName: services.name,
      patientName: users.name,
      patientEmail: users.email,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(users, eq(appointments.patientId, users.id))
    .where(eq(appointments.id, id));
  if (!appointment || (!isDoctor && appointment.patientId !== user.userId)) {
    throw new AppError(404, "Appointment not found");
  }
  if (appointment.status !== "BOOKED") {
    throw new AppError(409, `Appointment is already ${appointment.status.toLowerCase()}`);
  }
  if (appointment.startAt <= new Date()) {
    throw new AppError(409, "This appointment has already started");
  }
  if (!isDoctor && DateTime.fromJSDate(appointment.startAt).diffNow("hours").hours < CANCEL_NOTICE_HOURS) {
    throw new AppError(409, `You can only cancel at least ${CANCEL_NOTICE_HOURS} hours before the appointment`);
  }

  const [cancelled] = await db
    .update(appointments)
    .set({ status: "CANCELLED" })
    .where(and(eq(appointments.id, id), eq(appointments.status, "BOOKED")))
    .returning(appointmentFields);
  if (!cancelled) throw new AppError(409, "Appointment is already cancelled");

  void sendCancellationEmail(
    appointment.patientEmail,
    { patientName: appointment.patientName, serviceName: appointment.serviceName, startAt: appointment.startAt },
    isDoctor,
  );

  res.json({ success: true, msg: "Appointment cancelled", appointment: cancelled });
}

export async function UpdateAppointmentStatus(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const status: Appointment["status"] = req.body.status;

  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!appointment) throw new AppError(404, "Appointment not found");
  if (appointment.status !== "BOOKED") {
    throw new AppError(409, `Appointment is already ${appointment.status.toLowerCase()}`);
  }
  if (appointment.startAt > new Date()) {
    throw new AppError(409, "You can't update the status before the appointment starts");
  }

  const [updated] = await db
    .update(appointments)
    .set({ status })
    .where(and(eq(appointments.id, id), eq(appointments.status, "BOOKED")))
    .returning(appointmentFields);
  if (!updated) throw new AppError(409, "Appointment status was already changed");

  res.json({ success: true, msg: `Appointment marked as ${status}`, appointment: updated });
}
