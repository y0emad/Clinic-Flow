// Adds the logged-in user (the JWT payload) to Express's Request type,
// so controllers can use req.user without `any`.
declare global {
    namespace Express {
        interface AuthUser {
            userId: string;
            email: string;
            role: "DOCTOR" | "PATIENT";
        }

        interface Request {
            user?: AuthUser;
        }
    }
}

export {};
