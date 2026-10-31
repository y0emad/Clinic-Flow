import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export function checkErrors(req: Request, res: Response, next: NextFunction) {
    const result = validationResult(req);
    
    if (result.isEmpty()) {
        return next();
    }

    return res.status(400).json({ 
        success: false,
        msg: result.array()[0].msg
    });
}