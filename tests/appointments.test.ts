import { beforeEach, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { sendBookingConfirmationEmail, sendCancellationEmail } from "../src/utils/sendEmail.js";
import { CLINIC_TZ } from "../src/utils/slots.js";
import {
  api, auth, book, createService, createUser, dayString, getSlots, insertAppointment, openAllWeek, resetDb,
} from "./helpers.js";

type User = Awaited<ReturnType<typeof createUser>>;
type Service = Awaited<ReturnType<typeof createService>>;

let patient: User;
let doctor: User;
let service: Service;

beforeEach(async () => {
  await resetDb();
  patient = await createUser("PATIENT");
  doctor = await createUser("DOCTOR");
  service = await createService();
  await openAllWeek();
});

describe("POST /appointments", () => {
  it("books a free slot and sends a confirmation email", async () => {
    const [slot] = await getSlots(service.id, dayString(1));
    const res = await book(patient, service.id, slot.startAt);

    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({ status: "BOOKED", price: 200, startAt: slot.startAt, endAt: slot.endAt });
    expect(sendBookingConfirmationEmail).toHaveBeenCalledOnce();
  });

  it("rejects a startAt that is not one of the free slots", async () => {
    const [slot] = await getSlots(service.id, dayString(1));
    const notOnTheGrid = new Date(new Date(slot.startAt).getTime() + 7 * 60_000).toISOString();

    const res = await book(patient, service.id, notOnTheGrid);
    expect(res.status).toBe(409);
  });

  it("only lets patients book", async () => {
    const [slot] = await getSlots(service.id, dayString(1));
    const res = await api().post("/api/appointments").set(auth(doctor)).send({ serviceId: service.id, startAt: slot.startAt });
    expect(res.status).toBe(403);
  });

  it("never double-books: two patients racing for the same slot, exactly one wins", async () => {
    const other = await createUser("PATIENT");
    const [slot] = await getSlots(service.id, dayString(1));

    const results = await Promise.all([
      book(patient, service.id, slot.startAt),
      book(other, service.id, slot.startAt),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it("allows only one appointment per day per patient", async () => {
    const slots = await getSlots(service.id, dayString(1));
    expect((await book(patient, service.id, slots[0].startAt)).status).toBe(201);

    const res = await book(patient, service.id, slots[8].startAt);
    expect(res.status).toBe(409);
    expect(res.body.msg).toMatch(/already have an appointment on this day/);
  });

  it("allows at most 3 upcoming appointments", async () => {
    for (const day of [1, 2, 3]) {
      const [slot] = await getSlots(service.id, dayString(day));
      expect((await book(patient, service.id, slot.startAt)).status).toBe(201);
    }
    const [slot] = await getSlots(service.id, dayString(4));
    const res = await book(patient, service.id, slot.startAt);

    expect(res.status).toBe(409);
    expect(res.body.msg).toMatch(/more than 3 upcoming/);
  });
});

describe("GET /appointments", () => {
  it("patients only see their own appointments, with pagination", async () => {
    const other = await createUser("PATIENT");
    for (const day of [1, 2, 3]) {
      const [slot] = await getSlots(service.id, dayString(day));
      await book(patient, service.id, slot.startAt);
    }
    const [slot] = await getSlots(service.id, dayString(1));
    await book(other, service.id, slot.startAt);

    const res = await api().get("/api/appointments/me?page=2&limit=2").set(auth(patient));

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ currentPage: 2, limit: 2, totalItems: 3, totalPages: 2, hasNextPage: false, hasPrevPage: true });
  });

  it("the doctor sees every patient's appointments, without passwords", async () => {
    const other = await createUser("PATIENT");
    const [first, second] = [(await getSlots(service.id, dayString(1)))[0], (await getSlots(service.id, dayString(2)))[0]];
    await book(patient, service.id, first.startAt);
    await book(other, service.id, second.startAt);

    const res = await api().get("/api/appointments").set(auth(doctor));

    expect(res.status).toBe(200);
    expect(res.body.pagination.totalItems).toBe(2);
    expect(res.body.appointments[0].patient).not.toHaveProperty("password");
  });
});

describe("PATCH /appointments/:id/cancel", () => {
  it("a patient can cancel their own appointment", async () => {
    const [slot] = await getSlots(service.id, dayString(1));
    const { body } = await book(patient, service.id, slot.startAt);

    const res = await api().patch(`/api/appointments/${body.appointment.id}/cancel`).set(auth(patient));

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("CANCELLED");
    expect(sendCancellationEmail).toHaveBeenCalledOnce();
  });

  it("a patient can't cancel another patient's appointment (404, not 403)", async () => {
    const other = await createUser("PATIENT");
    const [slot] = await getSlots(service.id, dayString(1));
    const { body } = await book(other, service.id, slot.startAt);

    const res = await api().patch(`/api/appointments/${body.appointment.id}/cancel`).set(auth(patient));
    expect(res.status).toBe(404);
  });

  it("patients must cancel at least 2 hours before, the doctor can cancel any time", async () => {
    const inOneHour = new Date(Date.now() + 60 * 60_000);
    const appointment = await insertAppointment(patient.id, service.id, inOneHour);

    const byPatient = await api().patch(`/api/appointments/${appointment.id}/cancel`).set(auth(patient));
    expect(byPatient.status).toBe(409);

    const byDoctor = await api().patch(`/api/appointments/${appointment.id}/cancel`).set(auth(doctor));
    expect(byDoctor.status).toBe(200);
  });
});

describe("PATCH /appointments/:id/status", () => {
  it("can't mark an appointment as done before it starts", async () => {
    const [slot] = await getSlots(service.id, dayString(1));
    const { body } = await book(patient, service.id, slot.startAt);

    const res = await api().patch(`/api/appointments/${body.appointment.id}/status`).set(auth(doctor)).send({ status: "COMPLETED" });
    expect(res.status).toBe(409);
  });

  it("marks a past appointment as COMPLETED, only once", async () => {
    const appointment = await insertAppointment(patient.id, service.id, new Date(Date.now() - 60 * 60_000));
    const url = `/api/appointments/${appointment.id}/status`;

    const first = await api().patch(url).set(auth(doctor)).send({ status: "COMPLETED" });
    expect(first.status).toBe(200);
    expect(first.body.appointment.status).toBe("COMPLETED");

    const second = await api().patch(url).set(auth(doctor)).send({ status: "NO_SHOW" });
    expect(second.status).toBe(409);
  });
});

describe("GET /appointments/stats", () => {
  it("counts this month's completed, no-show and revenue", async () => {
    // Right after the 1st of this month started (clinic time), so it's always "this month" and in the past.
    const monthStart = DateTime.now().setZone(CLINIC_TZ).startOf("month");
    await insertAppointment(patient.id, service.id, monthStart.plus({ minutes: 1 }).toJSDate(), "COMPLETED");
    await insertAppointment(patient.id, service.id, monthStart.plus({ minutes: 2 }).toJSDate(), "NO_SHOW");

    const res = await api().get("/api/appointments/stats").set(auth(doctor));

    expect(res.status).toBe(200);
    expect(res.body.stats.thisMonth).toMatchObject({ completed: 1, noShow: 1, revenue: 200, noShowRate: 50 });
  });

  it("is for the doctor only", async () => {
    const res = await api().get("/api/appointments/stats").set(auth(patient));
    expect(res.status).toBe(403);
  });
});
