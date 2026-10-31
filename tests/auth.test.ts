import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendOTPEmail, sendOTPEmailForgetPass } from "../src/utils/sendEmail.js";
import { api, auth, createUser, PASSWORD, resetDb } from "./helpers.js";

beforeEach(resetDb);

// The OTP that "would have been emailed": the 2nd argument of the mocked send function.
const lastOtp = (fn: typeof sendOTPEmail) => vi.mocked(fn).mock.calls.at(-1)![1];

const newPatient = { name: "Sara Ali", email: "sara@example.test", phone: "01012345678", password: PASSWORD };

describe("signup → verify → login", () => {
  it("works end to end, and /auth/me returns the user", async () => {
    const signup = await api().post("/api/auth/signup").send(newPatient);
    expect(signup.status).toBe(201);
    expect(signup.body.user).not.toHaveProperty("password");

    const verify = await api().post("/api/auth/verify-otp").send({ email: newPatient.email, otp: lastOtp(sendOTPEmail) });
    expect(verify.status).toBe(200);

    const login = await api().post("/api/auth/login").send({ email: newPatient.email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTypeOf("string");

    const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: newPatient.email, role: "PATIENT" });
  });

  it("doesn't keep the account if the OTP email can't be sent, so signing up again works", async () => {
    const { AppError } = await import("../src/utils/AppError.js");
    vi.mocked(sendOTPEmail).mockRejectedValueOnce(new AppError(503, "We couldn't send the email right now, please try again in a minute"));

    const failed = await api().post("/api/auth/signup").send(newPatient);
    expect(failed.status).toBe(503);

    const retry = await api().post("/api/auth/signup").send(newPatient);
    expect(retry.status).toBe(201);
  });

  it("can't log in before verifying the email", async () => {
    await api().post("/api/auth/signup").send(newPatient);
    const res = await api().post("/api/auth/login").send({ email: newPatient.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it("rejects a wrong password with a generic message", async () => {
    const user = await createUser("PATIENT");
    const res = await api().post("/api/auth/login").send({ email: user.email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, msg: "Invalid email or password" });
  });

  it("/auth/me needs a valid token", async () => {
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set("Authorization", "Bearer not-a-token")).status).toBe(403);
  });
});

describe("forgot / reset password", () => {
  it("answers the same for registered and unknown emails", async () => {
    const user = await createUser("PATIENT");
    const known = await api().post("/api/auth/forgot-password").send({ email: user.email });
    const unknown = await api().post("/api/auth/forgot-password").send({ email: "nobody@example.test" });

    expect(known.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(sendOTPEmailForgetPass).toHaveBeenCalledOnce(); // only the real user got an email
  });

  it("resets the password with the OTP, and the OTP can't be reused", async () => {
    const user = await createUser("PATIENT");
    await api().post("/api/auth/forgot-password").send({ email: user.email });
    const otp = lastOtp(sendOTPEmailForgetPass);

    const reset = await api().post("/api/auth/reset-password").send({ email: user.email, otp, password: "newpass123" });
    expect(reset.status).toBe(200);

    const login = await api().post("/api/auth/login").send({ email: user.email, password: "newpass123" });
    expect(login.status).toBe(200);

    const reuse = await api().post("/api/auth/reset-password").send({ email: user.email, otp, password: "another123" });
    expect(reuse.status).toBe(400);
  });

  it("locks the OTP after 5 wrong tries, even if the right one comes next", async () => {
    const user = await createUser("PATIENT");
    await api().post("/api/auth/forgot-password").send({ email: user.email });
    const otp = lastOtp(sendOTPEmailForgetPass);
    const wrong = otp === "111111" ? "222222" : "111111";

    for (let i = 0; i < 5; i++) {
      const res = await api().post("/api/auth/reset-password").send({ email: user.email, otp: wrong, password: "newpass123" });
      expect(res.status).toBe(400);
    }
    const res = await api().post("/api/auth/reset-password").send({ email: user.email, otp, password: "newpass123" });
    expect(res.status).toBe(429);
  });
});

describe("roles", () => {
  it("GET /users is for the doctor only", async () => {
    const doctor = await createUser("DOCTOR");
    const patient = await createUser("PATIENT");

    expect((await api().get("/api/users").set(auth(patient))).status).toBe(403);

    const res = await api().get("/api/users").set(auth(doctor));
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.users[0]).not.toHaveProperty("password");
  });
});
