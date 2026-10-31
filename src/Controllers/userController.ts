import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

import {
  compareNumber,
  generateOTP,
  hashNumber,
} from "../Middleware/middleWare.js";
import jwt from "jsonwebtoken";
import { sendOTPEmail, sendOTPEmailForgetPass } from "../utils/sendEmail.js";
import { AppError } from "../utils/AppError.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

// How long the user must still wait before a new OTP can be sent (0 = can send now).
// timeOtp is the expiry time, so the OTP was sent at timeOtp - OTP_TTL_MS.
function otpCooldownMs(timeOtp: Date | null): number {
  if (!timeOtp) return 0;
  return timeOtp.getTime() - OTP_TTL_MS + RESEND_COOLDOWN_MS - Date.now();
}

// The only user fields that are ever sent to the client (never password / otp).
const publicUserFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
};

export async function getUser(_req: Request, res: Response) {
  const allUsers = await db.select(publicUserFields).from(users);
  return res.json({ success: true, users: allUsers });
}

// GET /auth/me: who is logged in. The frontend calls it on page load to restore the session.
export async function GetMe(req: Request, res: Response) {
  const [user] = await db
    .select(publicUserFields)
    .from(users)
    .where(eq(users.id, req.user!.userId));
  if (!user) {
    throw new AppError(401, "User no longer exists, please log in again");
  }
  return res.json({ success: true, user });
}

export async function CreateUser(req: Request, res: Response) {
  const { name, email, phone } = req.body;
  const hashedPassword = await hashNumber(req.body.password);
  const otpPlain = await generateOTP();
  const otp = await hashNumber(otpPlain);
  const timeOtp = new Date(Date.now() + OTP_TTL_MS);

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      password: hashedPassword,
      verified: false,
      otp,
      timeOtp,
    })
    .returning(publicUserFields);
  if (!user) {
    throw new AppError(400, "error to create the user");
  }

  await sendOTPEmail(user.email, otpPlain);
  return res.status(201).json({
    success: true,
    msg: "Account created, check your email for the OTP",
    user,
  });
}

export async function LoginUser(req: Request, res: Response) {
  const { email, password } = req.body;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !(await compareNumber(password, user.password))) {
    throw new AppError(401, "Invalid email or password");
  }
  if (!user.verified) {
    throw new AppError(403, "Please verify your email first");
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "24h",
  });

  return res.json({
    success: true,
    msg: "Logged in successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
  });
}

export async function VerifyOtp(req: Request, res: Response) {
  const { email, otp } = req.body;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (
    !user ||
    user.verified ||
    !user.otp ||
    !user.timeOtp ||
    user.timeOtp <= new Date()
  ) {
    throw new AppError(400, "Invalid or expired OTP");
  }
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(
      429,
      "Too many wrong attempts, please request a new OTP",
    );
  }
  const isMatch = await compareNumber(otp, user.otp);
  if (!isMatch) {
    await db
      .update(users)
      .set({ otpAttempts: sql`${users.otpAttempts} + 1` })
      .where(eq(users.id, user.id));
    throw new AppError(400, "Invalid or expired OTP");
  }
  await db
    .update(users)
    .set({
      verified: true,
      timeOtp: null,
      otp: null,
      otpAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  return res.status(200).json({
    success: true,
    msg: "Email verified successfully!",
  });
}

export async function ResendOtp(req: Request, res: Response) {
  const { email } = req.body;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new AppError(404, "Your email doesn't exist");
  }

  if (user.verified) {
    throw new AppError(400, "Your email is already verified");
  }

  const waitMs = otpCooldownMs(user.timeOtp);
  if (waitMs > 0) {
    throw new AppError(
      429,
      `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting a new OTP`,
    );
  }

  const otpPlain = await generateOTP();
  await db
    .update(users)
    .set({
      otp: await hashNumber(otpPlain),
      timeOtp: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
    })
    .where(eq(users.id, user.id));

  await sendOTPEmail(user.email, otpPlain);

  return res.status(200).json({ success: true, msg: "Your OTP has been sent" });
}

const FORGOT_PASSWORD_MSG = "If this email is registered, an OTP has been sent to reset your password";

export async function ForgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || otpCooldownMs(user.timeOtp) > 0) {
    return res.json({ success: true, msg: FORGOT_PASSWORD_MSG });
  }

  const otpPlain = await generateOTP();
  await db
    .update(users)
    .set({
      otp: await hashNumber(otpPlain),
      timeOtp: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
    })
    .where(eq(users.id, user.id));

  await sendOTPEmailForgetPass(user.email, otpPlain);

  return res.json({ success: true, msg: FORGOT_PASSWORD_MSG });
}

export async function ResetPassword(req: Request, res: Response) {
  const { email, password, otp } = req.body;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.otp || !user.timeOtp || user.timeOtp <= new Date()) {
    throw new AppError(400, "Invalid or expired OTP");
  }
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, "Too many wrong attempts, please request a new OTP");
  }

  const isMatch = await compareNumber(otp, user.otp);
  if (!isMatch) {
    await db
      .update(users)
      .set({ otpAttempts: sql`${users.otpAttempts} + 1` })
      .where(eq(users.id, user.id));
    throw new AppError(400, "Invalid or expired OTP");
  }

  // The OTP proves the user owns this email, so the account is verified too.
  await db
    .update(users)
    .set({
      password: await hashNumber(password),
      verified: true,
      otp: null,
      timeOtp: null,
      otpAttempts: 0,
    })
    .where(eq(users.id, user.id));

  return res.json({ success: true, msg: "Password reset successfully, you can log in now" });
}
