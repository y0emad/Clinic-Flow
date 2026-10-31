import { rateLimit } from "express-rate-limit";

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, msg: "Too many requests, please try again later" },
    skip: () => process.env.NODE_ENV === "test",
});

// Counted per logged-in patient (not per IP), so it must come after authenticateToken.
export const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => req.user!.userId,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, msg: "Too many booking attempts, please try again later" },
    skip: () => process.env.NODE_ENV === "test",
});
