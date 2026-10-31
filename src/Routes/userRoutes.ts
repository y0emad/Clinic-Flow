import { Router } from "express";
import { getUser } from "../Controllers/userController.js";
import { authDoc, authenticateToken } from "../Middleware/middleWare.js";

class UserRoutes {
    router = Router();
    constructor() {
        this.getUser();
    }

    getUser() {
        this.router.get("/", authenticateToken, authDoc, getUser);       // GET /users
    }
}

export default new UserRoutes().router;
