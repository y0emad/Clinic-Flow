import nodemailer, { type Transporter } from "nodemailer";
import { DateTime } from "luxon";
import { CLINIC_TZ } from "./slots.js";
import { AppError } from "./AppError.js";


// ---------- One place that actually sends emails ----------
// EMAIL_PROVIDER=smtp  → nodemailer (Ethereal / Gmail while developing)
// EMAIL_PROVIDER=brevo → Brevo HTTP API (production: many free hosts block SMTP ports, HTTPS always works)

type Mail = { to: string; subject: string; html: string };

const sender = () => ({
    name: process.env.EMAIL_FROM_NAME || "ClinicFlow",
    email: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
});

let transporter: Transporter | undefined;

async function sendWithSmtp({ to, subject, html }: Mail) {
    // Created on first use, so the env is already loaded.
    transporter ??= nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const { name, email } = sender();
    await transporter.sendMail({ from: `"${name}" <${email}>`, to, subject, html });
}

async function sendWithBrevo({ to, subject, html }: Mail) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY!,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ sender: sender(), to: [{ email: to }], subject, htmlContent: html }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
        throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
    }
}

export async function sendMail(mail: Mail) {
    if (process.env.EMAIL_PROVIDER === "brevo") return sendWithBrevo(mail);
    return sendWithSmtp(mail);
}

// User-typed text (names) must not be able to inject HTML into our emails.
const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ---------- Email layout (brand colors, inline styles: email clients ignore <style>) ----------

const NAVY = "#1C1C41";
const SKY = "#38BDF8";
const TEAL = "#2DD4BF";
const MUTED = "#64748B";

function layout(heading: string, body: string) {
    return `
<div style="background:#F8FAFC;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
    <div style="background:${NAVY};padding:20px 28px;">
      <span style="font-size:20px;font-weight:800;color:#ffffff;">Clinic<span style="color:${SKY};">Flow</span></span>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,${SKY},${TEAL});"></div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:${NAVY};">${heading}</h2>
      ${body}
    </div>
  </div>
  <p style="max-width:520px;margin:16px auto 0;text-align:center;font-size:12px;color:${MUTED};">
    You received this email because of activity on your ClinicFlow account.
  </p>
</div>`;
}

const paragraph = (text: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${text}</p>`;
const note = (text: string) => `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${text}</p>`;

const otpBox = (otp: string) => `
<div style="text-align:center;margin:24px 0;">
  <span style="display:inline-block;padding:14px 28px;border-radius:10px;background:#F0F9FF;border:1px dashed ${SKY};font-size:32px;font-weight:700;letter-spacing:8px;color:${NAVY};">${otp}</span>
</div>`;

const detailsTable = (rows: [string, string][]) => `
<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:15px;">
  ${rows
      .map(
          ([label, value]) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:${MUTED};width:110px;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-weight:600;">${value}</td>
  </tr>`,
      )
      .join("")}
</table>`;

// ---------- OTP emails ----------

// The user can't continue without the code, so a failure is an error for the request.
async function sendOtpMail(mail: Mail) {
    try {
        await sendMail(mail);
    } catch (error) {
        console.error(`Error sending "${mail.subject}" email to ${mail.to}:`, error);
        throw new AppError(503, "We couldn't send the email right now, please try again in a minute");
    }
}

export async function sendOTPEmail(toEmail: string, otp: string) {
    await sendOtpMail({
        to: toEmail,
        subject: "Your verification code - ClinicFlow",
        html: layout(
            "Welcome to ClinicFlow",
            paragraph("Use this code to verify your email address:") +
                otpBox(otp) +
                note("The code expires in 10 minutes. Don't share it with anyone."),
        ),
    });
}

export async function sendOTPEmailForgetPass(toEmail: string, otp: string) {
    await sendOtpMail({
        to: toEmail,
        subject: "Reset your password - ClinicFlow",
        html: layout(
            "Reset your password",
            paragraph("We received a request to reset the password of your ClinicFlow account. Use this code to continue:") +
                otpBox(otp) +
                note(
                    "The code expires in 10 minutes. If you didn't ask to reset your password, you can ignore this email and nothing will change.",
                ),
        ),
    });
}

// ---------- Appointment emails ----------

type AppointmentEmail = {
    patientName: string;
    serviceName: string;
    startAt: Date;
};

const formatClinicTime = (date: Date) =>
    DateTime.fromJSDate(date).setZone(CLINIC_TZ).setLocale("en").toFormat("cccc, d LLLL yyyy 'at' h:mm a");

// Booking / cancel emails are a bonus: if one fails, the appointment change still stands.
async function sendAppointmentEmail(toEmail: string, subject: string, html: string) {
    try {
        await sendMail({ to: toEmail, subject, html });
    } catch (error) {
        console.error(`Error sending "${subject}" email to ${toEmail}:`, error);
    }
}

const appointmentRows = (a: AppointmentEmail): [string, string][] => [
    ["Service", escapeHtml(a.serviceName)],
    ["When", formatClinicTime(a.startAt)],
];

export function sendBookingConfirmationEmail(toEmail: string, a: AppointmentEmail) {
    return sendAppointmentEmail(
        toEmail,
        "Your appointment is confirmed - ClinicFlow",
        layout(
            `Hi ${escapeHtml(a.patientName)}, you're booked!`,
            paragraph("Your appointment has been confirmed:") +
                detailsTable(appointmentRows(a)) +
                note("Need to cancel? Please do it at least 2 hours before your appointment from My appointments."),
        ),
    );
}

export function sendCancellationEmail(toEmail: string, a: AppointmentEmail, byDoctor: boolean) {
    return sendAppointmentEmail(
        toEmail,
        "Your appointment was cancelled - ClinicFlow",
        layout(
            `Hi ${escapeHtml(a.patientName)}`,
            paragraph(
                byDoctor
                    ? "We're sorry, the clinic had to cancel your appointment:"
                    : "Your appointment was cancelled as you requested:",
            ) +
                detailsTable(appointmentRows(a)) +
                note("You can book a new appointment any time."),
        ),
    );
}
