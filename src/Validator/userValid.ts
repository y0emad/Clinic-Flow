import { body } from "express-validator";
import { users } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
export const createUser = [
  body("name").isString().withMessage("Name must be a string"),
  body("email")
    .isEmail()
    .withMessage("Invalid email format")
    .custom(async (email: string) => {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser && existingUser.length > 0) {
        throw new Error("Email already exists");
      }
    }),
  body("phone").isMobilePhone("any").withMessage("Invalid phone number"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

export const loginUser = [
  body("email").isEmail().withMessage("Invalid email format"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const otpField = body("otp")
  .matches(/^\d{6}$/)
  .withMessage("OTP must be exactly 6 digits");

export const verifyOtp = [
  body("email").isEmail().withMessage("Invalid email format"),
  otpField,
];

export const resendOtp = [
  body("email").isEmail().withMessage("Invalid email format"),
];

export const forgotPassword = resendOtp;
export const resetPassword = [
  body("email").isEmail().withMessage("Invalid email format"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  otpField,
];
