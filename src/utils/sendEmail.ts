import nodemailer, { type Transporter } from "nodemailer";
import { DateTime } from "luxon";
import { CLINIC_TZ } from "./slots.js";


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

// OTP emails: the user can't continue without the code, so a failure is an error for the request.
async function sendOtpMail(mail: Mail) {
    try {
        await sendMail(mail);
    } catch (error) {
        console.error(`Error sending "${mail.subject}" email to ${mail.to}:`, error);
        throw new Error("Failed to send verification email");
    }
}

export async function sendOTPEmail(toEmail: string, otp: string) {
    await sendOtpMail({
            to: toEmail,
            subject: "رمز التحقق الخاص بك - ClinicFlow",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; direction: rtl; text-align: right;">
                    <h2>أهلاً بك في ClinicFlow</h2>
                    <p>رمز التحقق الخاص بك هو:</p>
                    <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
                    <p>هذا الرمز صالح لمدة 10 دقائق فقط. يرجى عدم مشاركته مع أحد.</p>
                </div>
            `,
    });
}

export async function sendOTPEmailForgetPass(toEmail: string, otp: string) {
    await sendOtpMail({
            to: toEmail,
            subject: "إعادة تعيين كلمة المرور - ClinicFlow",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; direction: rtl; text-align: right; background-color: #f8fafc; border-radius: 10px; color: #1e293b;">
                    <h2 style="color: #0f172a; margin-bottom: 16px;">طلب إعادة تعيين كلمة المرور</h2>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                        تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>ClinicFlow</strong>.
                    </p>
                    <p style="font-size: 15px; color: #334155;">استخدم رمز التحقق (OTP) التالي لإكمال العملية:</p>
                    
                    <div style="text-align: center; margin: 28px 0;">
                        <span style="background-color: #f0fdf4; color: #166534; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 28px; border-radius: 8px; border: 1px dashed #22c55e; display: inline-block;">
                            ${otp}
                        </span>
                    </div>
                    
                    <p style="font-size: 14px; color: #dc2626; margin-bottom: 20px;">
                        ⚠️ هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط. يرجى عدم مشاركته مع أي شخص.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                        إذا لم تقم بطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان، ولن يتم إجراء أي تغيير على حسابك.
                    </p>
                </div>
            `,
    });
}

type AppointmentEmail = {
    patientName: string;
    serviceName: string;
    startAt: Date;
};

const formatClinicTime = (date: Date) =>
    DateTime.fromJSDate(date).setZone(CLINIC_TZ).setLocale("ar").toFormat("cccc d LLLL yyyy - hh:mm a");


async function sendAppointmentEmail(toEmail: string, subject: string, body: string) {
    try {
        await sendMail({
            to: toEmail,
            subject,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; direction: rtl; text-align: right;">${body}</div>`,
        });
    } catch (error) {
        console.error(`Error sending "${subject}" email to ${toEmail}:`, error);
    }
}

export function sendBookingConfirmationEmail(toEmail: string, a: AppointmentEmail) {
    return sendAppointmentEmail(
        toEmail,
        "تأكيد حجز موعدك - ClinicFlow",
        `
            <h2>أهلاً ${escapeHtml(a.patientName)}</h2>
            <p>تم تأكيد حجزك بنجاح.</p>
            <p><strong>الخدمة:</strong> ${escapeHtml(a.serviceName)}</p>
            <p><strong>الموعد:</strong> ${formatClinicTime(a.startAt)}</p>
            <p>لو حابب تلغي، يرجى الإلغاء قبل الموعد بساعتين على الأقل.</p>
        `,
    );
}

export function sendCancellationEmail(toEmail: string, a: AppointmentEmail, byDoctor: boolean) {
    return sendAppointmentEmail(
        toEmail,
        "إلغاء موعدك - ClinicFlow",
        `
            <h2>أهلاً ${escapeHtml(a.patientName)}</h2>
            <p>${byDoctor ? "نعتذر، تم إلغاء موعدك من قِبل العيادة." : "تم إلغاء موعدك بناءً على طلبك."}</p>
            <p><strong>الخدمة:</strong> ${escapeHtml(a.serviceName)}</p>
            <p><strong>الموعد:</strong> ${formatClinicTime(a.startAt)}</p>
            <p>تقدر تحجز موعد جديد في أي وقت.</p>
        `,
    );
}
