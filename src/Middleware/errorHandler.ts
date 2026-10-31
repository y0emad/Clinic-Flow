import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

const UNIQUE_MESSAGES: Record<string, string> = {
    users_email_unique: "This email is already registered",
    services_name_active_unique: "A service with this name already exists",
};


export function notFound(req: Request, res: Response) {
    res.status(404).json({ success: false, msg: `Route ${req.method} ${req.originalUrl} not found` });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
    
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, msg: err.message });
    }


    const dbError = err?.cause ?? err;

    // 23505 = unique violation. Postgres tells us which constraint failed,
    // so we can give a clear message per constraint.
    if (dbError?.code === "23505") {
        const msg = UNIQUE_MESSAGES[dbError.constraint] ?? "This record already exists";
        return res.status(409).json({ success: false, msg });
    }

    // 23P01 = exclusion violation: two BOOKED appointments overlap (someone booked this slot first).
    if (dbError?.code === "23P01") {
        return res.status(409).json({ success: false, msg: "This time slot was just booked, please choose another" });
    }

    // Malformed JSON in the request body.
    if (err?.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, msg: "Invalid JSON body" });
    }

    // Anything else: log the real cause, send a generic message.
    console.error(dbError);
    return res.status(500).json({ success: false, msg: "Something went wrong, please try again" });
}
