import type { Request, Response } from "express";
import { asc, eq, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import { timeOff, workingHours, type NewTimeOff, type NewWorkingHours } from "../db/schema.js";
import { matchedData } from "express-validator";
import { AppError } from "../utils/AppError.js";


const toHHmm = (t: string) => t.slice(0, 5);

const fields = {
    dayOfWeek: workingHours.dayOfWeek,
    startTime: workingHours.startTime,
    endTime: workingHours.endTime,
};

export async function getWorkingHours(_req: Request, res: Response) {      
    const rows = await db.select(fields).from(workingHours).orderBy(asc(workingHours.dayOfWeek));
    res.json({
        success: true,
        workingHours: rows.map((r) => ({ ...r, startTime: toHHmm(r.startTime), endTime: toHHmm(r.endTime) })),
    });
}

export async function CreateWorkingHours(req: Request, res: Response) {
 
    const days: NewWorkingHours[] = req.body.days.map((d: any) => ({
        dayOfWeek: Number(d.dayOfWeek),
        startTime: d.startTime,
        endTime: d.endTime,
    }));

    const saved = await db.transaction(async (tx) => {
        await tx.delete(workingHours);
        return tx.insert(workingHours).values(days).returning(fields);   
    });

    res.json({
        success: true,
        msg: "Working hours saved",
        workingHours: saved
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((r) => ({ ...r, startTime: toHHmm(r.startTime), endTime: toHHmm(r.endTime) })),
    });
}



const timeOffFields = {
    id: timeOff.id,
    startAt: timeOff.startAt,
    endAt: timeOff.endAt,
    reason: timeOff.reason,
};

export async function getTimeOff(_req: Request, res: Response) {
    const rows = await db
        .select(timeOffFields)
        .from(timeOff)
        .where(gte(timeOff.endAt, new Date()))
        .orderBy(asc(timeOff.startAt));
    res.json({ success: true, timeOff: rows });
}

export async function CreateTimeOff(req: Request, res: Response) {
    const data = matchedData(req, { locations: ["body"] }) as NewTimeOff;
    const [created] = await db.insert(timeOff).values(data).returning(timeOffFields);
    res.status(201).json({ success: true, msg: "Time off created", timeOff: created });
}

export async function DeleteTimeOff(req: Request<{ id: string }>, res: Response) {
    const [deleted] = await db
        .delete(timeOff)
        .where(eq(timeOff.id, req.params.id))
        .returning({ id: timeOff.id });
    if (!deleted) {
        throw new AppError(404, "Time off not found");
    }
    res.json({ success: true, msg: "Time off deleted" });
}