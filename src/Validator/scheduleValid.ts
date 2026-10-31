import { body, param } from "express-validator";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const MAX_TIME_OFF_DAYS = 30;


function indexFromPath(path: string): number {
    const match = path.match(/\[(\d+)\]/);
    return match ? Number(match[1]) : -1;
}

export const createWorkingHours = [
    body("days")
        .isArray({ min: 1, max: 7 }).withMessage("days must be a list of 1 to 7 days")
        .bail()
        .custom((days: any[]) => {
            const unique = new Set(days.map((d) => Number(d?.dayOfWeek)));
            if (unique.size !== days.length) {
                throw new Error("Each day can appear only once");
            }
            return true; 
        }),

    body("days.*.dayOfWeek")
        .isInt({ min: 0, max: 6 }).withMessage("dayOfWeek must be a number from 0 (Sunday) to 6 (Saturday)"),

    body("days.*.startTime")
        .matches(TIME).withMessage("startTime must be HH:mm, e.g. 09:00"),

    body("days.*.endTime")
        .matches(TIME).withMessage("endTime must be HH:mm, e.g. 17:00")
        .bail()
        .custom((endTime: string, { req, path }) => {
            const day = req.body.days[indexFromPath(path)];
            if (endTime <= day.startTime) {
                throw new Error(`endTime must be after startTime (dayOfWeek ${day.dayOfWeek})`);
            }
            return true;
        }),

    
];


export const createTimeOff = [
    body("startAt")
        .isISO8601().withMessage("startAt must be a valid date, e.g. 2026-11-05T09:00:00Z")
        .bail()
        .toDate(),

    body("endAt")
        .isISO8601().withMessage("endAt must be a valid date, e.g. 2026-11-05T17:00:00Z")
        .bail()
        .toDate()
        .custom((endAt: Date, { req }) => {
            const startAt = new Date(req.body.startAt);
            if (endAt <= startAt) {
                throw new Error("endAt must be after startAt");
            }
            if (endAt <= new Date()) {
                throw new Error("endAt must be in the future");
            }
            if (endAt.getTime() - startAt.getTime() > MAX_TIME_OFF_DAYS * 24 * 60 * 60 * 1000) {
                throw new Error(`Time off can't be longer than ${MAX_TIME_OFF_DAYS} days`);
            }
            return true;
        }),

    body("reason")
        .optional()
        .isString().trim().isLength({ max: 200 })
        .withMessage("reason must be text (max 200 characters)"),
];

export const deleteTimeOff = [
    param("id").isUUID().withMessage("Invalid time-off id"),
];