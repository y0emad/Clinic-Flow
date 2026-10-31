import bcrypt from "bcrypt";
import  jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
export async function hashNumber(number: string): Promise<string> {
    try {
        const saltRounds = 10;
        const hashedNumber: string = await bcrypt.hash(number, saltRounds);
        return hashedNumber ;
    }
    catch (error) {
        throw new Error("Error hashing number");
    }


}



export async function compareNumber(number: string, hashednumber: string): Promise<boolean> {
    try {
        const isMatch: boolean = await bcrypt.compare(number, hashednumber);
        return isMatch;
    } catch (error) {
        throw new Error("Error comparing numbers");
    }
}


export async function generateOTP(): Promise<string> {
    return randomInt(100000, 1000000).toString();
}




export function authenticateToken(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        throw new AppError(401, "Access denied. No token provided.");
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET!) as Express.AuthUser;
    } catch {
        throw new AppError(403, "Invalid or expired token.");
    }
    next();
}


export function authDoc(req: Request, _res: Response, next: NextFunction){
    if(!req.user || req.user.role !== "DOCTOR"){
        throw new AppError(403, "Access denied. Doctors only.");
    }
    next();
}
export function authPatient(req: Request, _res: Response, next: NextFunction){
    if(!req.user || req.user.role !== "PATIENT"){
        throw new AppError(403, "Access denied. Patients only.");
    }
    next();
}