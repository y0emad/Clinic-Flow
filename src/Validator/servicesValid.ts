import { body, param } from "express-validator";

const serviceId = param("id").isUUID().withMessage("Invalid service id");

export const getServiceByID = [serviceId];

export const createServices = [
    body("name").isString().trim().isLength({ min: 2, max: 100 })
        .withMessage("name is required (2-100 characters)"),
    body("description").optional().isString().trim().isLength({ max: 500 })
        .withMessage("description must be text (max 500 characters)"),
    body("durationMinutes").isInt({ min: 5, max: 240 }).toInt()
        .withMessage("durationMinutes must be a whole number between 5 and 240"),
    body("price").isInt({ min: 0 }).toInt()
        .withMessage("price must be a whole number of 0 or more"),
    body("isActive").optional().isBoolean().toBoolean()
        .withMessage("isActive must be true or false"),
];

export const updateService = [
    serviceId,
    body("name").optional().isString().trim().isLength({ min: 2, max: 100 })
        .withMessage("name must be 2-100 characters"),
    body("description").optional().isString().trim().isLength({ max: 500 })
        .withMessage("description must be text (max 500 characters)"),
    body("durationMinutes").optional().isInt({ min: 5, max: 240 }).toInt()
        .withMessage("durationMinutes must be a whole number between 5 and 240"),
    body("price").optional().isInt({ min: 0 }).toInt()
        .withMessage("price must be a whole number of 0 or more"),
    body("isActive").optional().isBoolean().toBoolean()
        .withMessage("isActive must be true or false"),
];

export const deleteService = [serviceId];
