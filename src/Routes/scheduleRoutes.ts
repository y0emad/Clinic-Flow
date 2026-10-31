import { Router } from "express";

import { authDoc, authenticateToken } from "../Middleware/middleWare.js";
import { checkErrors } from "../Middleware/checkErrors.js";
import { CreateTimeOff, CreateWorkingHours, DeleteTimeOff, getTimeOff, getWorkingHours } from "../Controllers/scheduleController.js";
import { createTimeOff, createWorkingHours, deleteTimeOff } from "../Validator/scheduleValid.js";

class ScheduleRoutes {
    router = Router();
    constructor() {
        this.workingHoursRoutes()
        this.timeOffRoutes();
    }

    workingHoursRoutes() {
        this.router.get("/working-hours", getWorkingHours);                                                       // GET /schedule/working-hours
        this.router.put("/working-hours", authenticateToken, authDoc, createWorkingHours, checkErrors, CreateWorkingHours); // PUT /schedule/working-hours
    }
    timeOffRoutes(){
        this.router.get("/time-off",authenticateToken,authDoc,getTimeOff)
        this.router.post("/time-off",authenticateToken,authDoc ,createTimeOff, checkErrors,CreateTimeOff)
        this.router.delete("/time-off/:id",authenticateToken,authDoc ,deleteTimeOff, checkErrors,DeleteTimeOff)
    }
}


export default new ScheduleRoutes().router;
