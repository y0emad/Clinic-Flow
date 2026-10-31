import dotenv from "dotenv";
import { afterAll, vi } from "vitest";

// Load the test env BEFORE any app code runs, so the db pool connects to the test database.
dotenv.config({ path: ".env.test", override: true, quiet: true });

// Never send real emails from tests. Tests can read the OTP from these mocks' calls.
vi.mock("../src/utils/sendEmail.js", () => ({
  sendOTPEmail: vi.fn(),
  sendOTPEmailForgetPass: vi.fn(),
  sendBookingConfirmationEmail: vi.fn(),
  sendCancellationEmail: vi.fn(),
}));

afterAll(async () => {
  const { pool } = await import("../src/db/index.js");
  await pool.end();
});
