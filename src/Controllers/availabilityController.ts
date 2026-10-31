import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { services } from "../db/schema.js";
import { AppError } from "../utils/AppError.js";
import { getAvailableSlots } from "../utils/slots.js";

export async function GetAvailability(req: Request<{ serviceId: string }>, res: Response) {
    const { serviceId } = req.params;
    const date = req.query.date as string;

    const [service] = await db
        .select({ id: services.id, name: services.name, durationMinutes: services.durationMinutes })
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.isActive, true)));
    if (!service) throw new AppError(404, "Service not found");

    const { closed, slots } = await getAvailableSlots(service.durationMinutes, date);

    res.json({
        success: true,
        date,
        service,
        closed,
        slots: slots.map((s) => ({
            startAt: s.start.toUTC().toISO(),  
            endAt: s.end.toUTC().toISO(),
            time: s.start.toFormat("HH:mm"),   
        })),
    });
}
