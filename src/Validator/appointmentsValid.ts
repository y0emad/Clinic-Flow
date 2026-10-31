import { body, param, query } from "express-validator";
import { DateTime } from "luxon";
import { CLINIC_TZ } from "../utils/slots.js";
import { appointmentStatusEnum } from "../db/schema.js";

export const createAppointment = [
  body("serviceId").isUUID().withMessage("serviceId must be a valid id"),
  body("startAt")
    .isISO8601()
    .withMessage("startAt must be a valid date, e.g. 2026-11-07T14:45:00.000Z")
    .bail()
    .toDate(),
  body("notes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("notes must be text (max 500 characters)"),
];

const STATUSES = appointmentStatusEnum.enumValues;

const statusFilter = query("status")
  .optional()
  .isIn(STATUSES)
  .withMessage(`status must be one of ${STATUSES.join(", ")}`);

const MAX_LIMIT = 50;
const pagination = [
  query("page")
    .default(1)
    .isInt({ min: 1 })
    .withMessage("page must be a whole number, 1 or more")
    .toInt(),
  query("limit")
    .default(10)
    .isInt({ min: 1, max: MAX_LIMIT })
    .withMessage(`limit must be a whole number between 1 and ${MAX_LIMIT}`)
    .toInt(),
];

export const getMyAppointment = [statusFilter, ...pagination];

export const getAllAppointments = [
  statusFilter,
  query("date")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("date must be YYYY-MM-DD, e.g. 2026-11-05")
    .bail()
    .custom((value: string) => {
      if (!DateTime.fromISO(value, { zone: CLINIC_TZ }).isValid)
        throw new Error("date is not a real date");
      return true;
    }),
  ...pagination,
];

const appointmentId = param("id")
  .isUUID()
  .withMessage("Invalid appointment id");

export const cancelAppointment = [appointmentId];

const FINAL_STATUSES = ["COMPLETED", "NO_SHOW"];
export const updateAppointmentStatus = [
  appointmentId,
  body("status")
    .isIn(FINAL_STATUSES)
    .withMessage(`status must be one of ${FINAL_STATUSES.join(", ")}`),
];
