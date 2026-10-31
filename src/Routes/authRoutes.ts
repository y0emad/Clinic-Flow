import { Router } from "express";
import { CreateUser, LoginUser, VerifyOtp, ResendOtp, ForgotPassword, ResetPassword, GetMe } from "../Controllers/userController.js";
import { authenticateToken } from "../Middleware/middleWare.js";
import { createUser, forgotPassword, loginUser, resendOtp, resetPassword, verifyOtp } from "../Validator/userValid.js";
import { checkErrors } from "../Middleware/checkErrors.js";
import { authLimiter } from "../Middleware/rateLimit.js";

class AuthRoutes {
    router = Router();
    constructor() {
        this.getAuth();
        this.postAuth();
    }

    getAuth() {
        this.router.get("/me", authenticateToken, GetMe);                                          // GET /auth/me
    }

    postAuth() {
        this.router.post("/signup", authLimiter, createUser, checkErrors, CreateUser);              // POST /auth/signup
        this.router.post("/login", authLimiter, loginUser, checkErrors, LoginUser);                 // POST /auth/login
        this.router.post("/verify-otp", authLimiter, verifyOtp, checkErrors, VerifyOtp);            // POST /auth/verify-otp
        this.router.post("/resend-otp", authLimiter, resendOtp, checkErrors, ResendOtp);            // POST /auth/resend-otp
        this.router.post("/forgot-password", authLimiter, forgotPassword, checkErrors, ForgotPassword);    // POST /auth/forgot-password
        this.router.post("/reset-password", authLimiter, resetPassword, checkErrors, ResetPassword);       // POST /auth/reset-password
    }
}

export default new AuthRoutes().router;
