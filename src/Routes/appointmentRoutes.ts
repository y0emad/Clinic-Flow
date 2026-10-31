import { Router } from "express";
import { checkErrors } from "../Middleware/checkErrors.js";
import { authDoc, authenticateToken, authPatient } from "../Middleware/middleWare.js";
import { cancelAppointment, createAppointment, getAllAppointments, getMyAppointment, updateAppointmentStatus } from "../Validator/appointmentsValid.js";
import { CancelAppointment, CreateAppointment, GetAllAppointments, GetAppointmentStats, GetMyAppointments, UpdateAppointmentStatus } from "../Controllers/appointmentController.js";
import { bookingLimiter } from "../Middleware/rateLimit.js";

class AppointmentRoutes {
    router = Router();
    constructor() {
        this.postAppointment();
        this.getAppointment();
        this.patchAppointment();
    }

    postAppointment() {
        this.router.post("/", authenticateToken, authPatient, bookingLimiter, createAppointment, checkErrors, CreateAppointment);      // POST /appointments
    }
    getAppointment() {
        this.router.get("/me", authenticateToken, authPatient, getMyAppointment, checkErrors, GetMyAppointments);     // GET /appointments/me?status=&page=&limit=
        this.router.get("/", authenticateToken, authDoc, getAllAppointments, checkErrors, GetAllAppointments);         // GET /appointments?status=&date=&page=&limit=
        this.router.get("/stats", authenticateToken, authDoc, GetAppointmentStats);                                    // GET /appointments/stats
    }
    patchAppointment() {
        this.router.patch("/:id/cancel", authenticateToken, cancelAppointment, checkErrors, CancelAppointment);                       // PATCH /appointments/:id/cancel
        this.router.patch("/:id/status", authenticateToken, authDoc, updateAppointmentStatus, checkErrors, UpdateAppointmentStatus);   // PATCH /appointments/:id/status
    }
}

export default new AppointmentRoutes().router;
