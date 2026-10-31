import { Router } from "express";
import { checkErrors } from "../Middleware/checkErrors.js";
import { getAvailability } from "../Validator/availabilityValid.js";
import { GetAvailability } from "../Controllers/availabilityController.js";

class AvailabilityRoutes {
    router = Router();
    constructor() {
        this.getAvailability();
    }

    getAvailability() {
        this.router.get("/:serviceId", getAvailability, checkErrors, GetAvailability);   // GET /availability/:serviceId?date=2026-11-05
    }
}

export default new AvailabilityRoutes().router;
