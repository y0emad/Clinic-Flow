import type { Request, Response } from "express";
import { matchedData } from "express-validator";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { services, type NewService } from "../db/schema.js";
import { AppError } from "../utils/AppError.js";

const publicFields = {
    id: services.id,
    name: services.name,
    description: services.description,
    durationMinutes: services.durationMinutes,
    price: services.price,
};

export async function getServices(_req: Request, res: Response) {
    const list = await db
        .select(publicFields)
        .from(services)
        .where(eq(services.isActive, true))
        .orderBy(asc(services.name));
    res.json({ success: true, services: list });
}

export async function getServiceById(req: Request<{ id: string }>, res: Response) {
    const [service] = await db
        .select(publicFields)
        .from(services)
        .where(and(eq(services.id, req.params.id), eq(services.isActive, true)))
        .limit(1);
    if (!service) {
        throw new AppError(404, "Service not found");
    }
    res.json({ success: true, service });
}


export async function createService(req: Request, res: Response) {
    const data = matchedData(req, { locations: ["body"] }) as NewService;
    const [service] = await db.insert(services).values(data).returning();
    res.status(201).json({ success: true, service });
}


export async function UpdateService(req: Request<{ id: string }>, res: Response) {
    const data = matchedData(req, { locations: ["body"] }) as Partial<NewService>;
    if (Object.keys(data).length === 0) {
        throw new AppError(400, "Send at least one field to update");
    }
    const [service] = await db
        .update(services)
        .set(data)
        .where(eq(services.id, req.params.id))
        .returning();
    if (!service) {
        throw new AppError(404, "Service not found");
    }
    res.json({ success: true, service });
}


export async function DeleteService(req: Request<{ id: string }>, res: Response) {
    const [service] = await db
        .update(services)
        .set({ isActive: false })
        .where(and(eq(services.id, req.params.id), eq(services.isActive, true)))
        .returning({ id: services.id });
    if (!service) {
        throw new AppError(404, "Service not found");
    }
    res.json({ success: true, msg: "Service deleted successfully" });
}
