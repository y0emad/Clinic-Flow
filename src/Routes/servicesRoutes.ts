import { Router } from "express";

import { createService, DeleteService, getServiceById, getServices, UpdateService } from "../Controllers/servicesController.js";
import { authDoc, authenticateToken } from "../Middleware/middleWare.js";
import { createServices, deleteService, getServiceByID, updateService } from "../Validator/servicesValid.js";
import { checkErrors } from "../Middleware/checkErrors.js";


class ServicesRoutes {
    router = Router();
    constructor() {
        this.getService()
        this.postService()
        this.patchService()
        this.deleteService()
    }

    getService() {
        this.router.get("/", getServices);                                         // GET /services
        this.router.get("/:id", getServiceByID, checkErrors, getServiceById);       // GET /services/:id
    }

    postService(){
        this.router.post("/", authenticateToken, authDoc, createServices, checkErrors, createService)          // POST /services
    }

    patchService(){
        this.router.patch("/:id", authenticateToken, authDoc, updateService, checkErrors, UpdateService)      // PATCH /services/:id
    }

    deleteService(){
        this.router.delete("/:id", authenticateToken, authDoc, deleteService, checkErrors, DeleteService)     // DELETE /services/:id
    }

}


export default new ServicesRoutes().router;
