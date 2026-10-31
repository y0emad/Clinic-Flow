import { param, query } from "express-validator";
import { DateTime } from "luxon";
import { CLINIC_TZ } from "../utils/slots.js";

export const getAvailability = [
    param("serviceId").isUUID().withMessage("Invalid service id"),

    query("date")
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("date must be YYYY-MM-DD, e.g. 2026-11-05")
        .bail()
        .custom((value: string) => {
            const day = DateTime.fromISO(value, { zone: CLINIC_TZ });
            if (!day.isValid) throw new Error("date is not a real date");

            const today = DateTime.now().setZone(CLINIC_TZ).startOf("day");
            if (day < today) throw new Error("date can't be in the past");
            if (day > today.plus({ days: 60 })) throw new Error("You can only book up to 60 days ahead");
            return true;
        }),
];
