import { beforeEach, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { CLINIC_TZ } from "../src/utils/slots.js";
import {
  addTimeOff, api, auth, book, clinicDay, createService, createUser, dayString, getSlots, openAllWeek, resetDb,
} from "./helpers.js";

let service: Awaited<ReturnType<typeof createService>>;

beforeEach(async () => {
  await resetDb();
  service = await createService({ durationMinutes: 30 });
});

describe("GET /availability/:serviceId", () => {
  it("a day with no working hours is closed", async () => {
    const res = await api().get(`/availability/${service.id}?date=${dayString(1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ closed: true, slots: [] });
  });

  it("makes a slot every 15 minutes inside the working hours, in clinic time", async () => {
    await openAllWeek();
    const slots = await getSlots(service.id, dayString(1));

    // 09:00 → 16:30 is the last 30-min slot that ends by 17:00: (7.5h * 4) + 1 = 31 slots.
    expect(slots).toHaveLength(31);
    expect(slots[0].time).toBe("09:00");
    expect(slots[1].time).toBe("09:15");
    expect(slots.at(-1)!.time).toBe("16:30");

    // startAt is UTC but must be 09:00 in Cairo (works in summer and winter time).
    expect(DateTime.fromISO(slots[0].startAt).setZone(CLINIC_TZ).toFormat("HH:mm")).toBe("09:00");
  });

  it("removes booked slots, and gives them back after a cancel", async () => {
    await openAllWeek();
    const patient = await createUser("PATIENT");
    const before = await getSlots(service.id, dayString(1));
    const { body } = await book(patient, service.id, before[0].startAt); // 09:00-09:30

    const booked = (await getSlots(service.id, dayString(1))).map((s) => s.time);
    // 09:00 and 09:15 overlap the booking; 09:30 starts when it ends, so it's free.
    expect(booked).not.toContain("09:00");
    expect(booked).not.toContain("09:15");
    expect(booked).toContain("09:30");

    await api().patch(`/appointments/${body.appointment.id}/cancel`).set(auth(patient));
    expect(await getSlots(service.id, dayString(1))).toHaveLength(before.length);
  });

  it("removes slots during the doctor's time off", async () => {
    await openAllWeek();
    const day = clinicDay(1);
    await addTimeOff(day.set({ hour: 9 }).toJSDate(), day.set({ hour: 12 }).toJSDate());

    const times = (await getSlots(service.id, dayString(1))).map((s) => s.time);
    expect(times[0]).toBe("12:00");
  });

  it("rejects past dates, dates over 60 days ahead and bad formats", async () => {
    for (const date of [dayString(-1), dayString(61), "2026-13-01", "tomorrow"]) {
      const res = await api().get(`/availability/${service.id}?date=${date}`);
      expect(res.status, date).toBe(400);
    }
  });

  it("returns 404 for an inactive service", async () => {
    const inactive = await createService({ isActive: false });
    const res = await api().get(`/availability/${inactive.id}?date=${dayString(1)}`);
    expect(res.status).toBe(404);
  });
});
