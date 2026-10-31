import { and, eq, gt, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../db/index.js";
import { appointments, timeOff, workingHours } from "../db/schema.js";

export const CLINIC_TZ = "Africa/Cairo";
export const SLOT_STEP_MINUTES = 15;

export interface Slot {
    start: DateTime;
    end: DateTime;
}

export function generateSlots(date: string, openTime: string, closeTime: string, durationMinutes: number): Slot[] {
    const open = DateTime.fromISO(`${date}T${openTime}`, { zone: CLINIC_TZ });
    const close = DateTime.fromISO(`${date}T${closeTime}`, { zone: CLINIC_TZ });

    const slots: Slot[] = [];
    let start = open;
    while (start.plus({ minutes: durationMinutes }) <= close) {
        slots.push({ start, end: start.plus({ minutes: durationMinutes }) });
        start = start.plus({ minutes: SLOT_STEP_MINUTES });
    }
    return slots;
}

export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && bStart < aEnd;

// date = "YYYY-MM-DD" in clinic time.
export async function getAvailableSlots(durationMinutes: number, date: string): Promise<{ closed: boolean; slots: Slot[] }> {
    // 1) Working hours for that weekday (luxon weekday: 1 = Monday ... 7 = Sunday -> % 7 makes Sunday 0).
    const day = DateTime.fromISO(date, { zone: CLINIC_TZ });
    const [hours] = await db.select().from(workingHours).where(eq(workingHours.dayOfWeek, day.weekday % 7));
    if (!hours) return { closed: true, slots: [] };

    const dayStart = day.startOf("day").toJSDate();
    const dayEnd = day.endOf("day").toJSDate();

    const offs = await db
        .select({ startAt: timeOff.startAt, endAt: timeOff.endAt })
        .from(timeOff)
        .where(and(lt(timeOff.startAt, dayEnd), gt(timeOff.endAt, dayStart)));

    const booked = await db
        .select({ startAt: appointments.startAt, endAt: appointments.endAt })
        .from(appointments)
        .where(and(eq(appointments.status, "BOOKED"), lt(appointments.startAt, dayEnd), gt(appointments.endAt, dayStart)));

    const blocked = [...offs, ...booked];

    const now = new Date();
    const slots = generateSlots(date, hours.startTime, hours.endTime, durationMinutes)
        .filter((s) => s.start.toJSDate() > now)
        .filter((s) => !blocked.some((b) => overlaps(s.start.toJSDate(), s.end.toJSDate(), b.startAt, b.endAt)));

    return { closed: false, slots };
}
