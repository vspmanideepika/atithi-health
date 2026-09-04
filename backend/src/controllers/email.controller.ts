import * as nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"Atithi Health Support" <no-reply@atithihealth.com>';

let transporter: nodemailer.Transporter | null = null;
let isEthereal = false;

// Async function to initialize the transporter on demand
const getTransporter = async (): Promise<nodemailer.Transporter | null> => {
    if (transporter) return transporter;

    try {
        if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
            transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: SMTP_PORT,
                secure: SMTP_PORT === 465,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });
            console.log(`[Email Service] Custom SMTP transporter initialized for host ${SMTP_HOST}.`);
        } else {
            console.warn("[Email Service] SMTP config missing in .env. Generating a temporary Ethereal test account...");
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            isEthereal = true;
            console.log(`[Email Service] Ethereal test account generated: ${testAccount.user}`);
        }
    } catch (error) {
        console.error("[Email Service] Error initializing SMTP transporter:", error);
    }

    return transporter;
};

interface SendMailParams {
    to: string;
    subject: string;
    text: string;
    html: string;
}

export const sendEmail = async ({ to, subject, text, html }: SendMailParams): Promise<boolean> => {
    try {
        const mailTransporter = await getTransporter();
        
        if (mailTransporter) {
            const info = await mailTransporter.sendMail({
                from: SMTP_FROM,
                to,
                subject,
                text,
                html,
            });
            
            console.log(`[Email Service] Email sent successfully to ${to} (Subject: "${subject}")`);
            
            if (isEthereal) {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                console.log("=========================================");
                console.log(`[Email Service] Ethereal Message Sent`);
                console.log(`TO: ${to}`);
                console.log(`SUBJECT: ${subject}`);
                console.log(`PREVIEW URL: ${previewUrl}`);
                console.log("=========================================");
            }
            return true;
        } else {
            console.log("=========================================");
            console.log(`[Email Service] MOCK LOG ONLY (Transporter Init Failed)`);
            console.log(`TO: ${to}`);
            console.log(`SUBJECT: ${subject}`);
            console.log(`TEXT CONTENT:\n${text}`);
            console.log("=========================================");
            return true;
        }
    } catch (error) {
        console.error(`[Email Service] Failed to send email to ${to}:`, error);
        return false;
    }
};

export const sendBookingConfirmationEmail = async (
    patientEmail: string,
    patientName: string,
    bookingDetails: { id: string; tripTitle: string; surgeryDate: string; hospitalName: string },
    coordinatorDetails: { name: string; email: string }
): Promise<boolean> => {
    const subject = `Booking Confirmed: ${bookingDetails.tripTitle}`;
    
    const text = `Hello ${patientName},\n\n` +
        `Your booking for the medical travel package "${bookingDetails.tripTitle}" has been CONFIRMED by the hospital admin.\n\n` +
        `Booking Details:\n` +
        `- Booking ID: ${bookingDetails.id}\n` +
        `- Hospital: ${bookingDetails.hospitalName}\n` +
        `- Scheduled Travel/Arrival Date: ${bookingDetails.surgeryDate}\n\n` +
        `Assigned Coordinator Attendant Details:\n` +
        `- Name: ${coordinatorDetails.name}\n` +
        `- Email: ${coordinatorDetails.email}\n\n` +
        `Your coordinator will contact you shortly to arrange travel logistics and translation support.\n\n` +
        `Best regards,\n` +
        `Atithi Health Care Team`;

    const html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">` +
        `<div style="background-color: #0A4EA3; padding: 20px; text-align: center; color: #ffffff;">` +
        `<h2 style="margin: 0;">Booking Confirmed!</h2>` +
        `</div>` +
        `<div style="padding: 24px;">` +
        `<p>Hello <strong>${patientName}</strong>,</p>` +
        `<p>Your booking for the medical travel package <strong>${bookingDetails.tripTitle}</strong> has been <strong>CONFIRMED</strong> by the hospital admin.</p>` +
        `<div style="background-color: #f8fafc; border-left: 4px solid #0A4EA3; padding: 16px; margin: 20px 0; border-radius: 4px;">` +
        `<h3 style="margin-top: 0; color: #0A4EA3;">Booking Summary</h3>` +
        `<table style="width: 100%; border-collapse: collapse;">` +
        `<tr><td style="padding: 4px 0; font-weight: bold; width: 140px;">Booking ID:</td><td style="padding: 4px 0;">${bookingDetails.id}</td></tr>` +
        `<tr><td style="padding: 4px 0; font-weight: bold;">Hospital:</td><td style="padding: 4px 0;">${bookingDetails.hospitalName}</td></tr>` +
        `<tr><td style="padding: 4px 0; font-weight: bold;">Scheduled Date:</td><td style="padding: 4px 0;">${bookingDetails.surgeryDate}</td></tr>` +
        `</table>` +
        `</div>` +
        `<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">` +
        `<h3 style="margin-top: 0; color: #16a34a;">Your Assigned Care Coordinator</h3>` +
        `<p style="margin: 4px 0;"><strong>Name:</strong> ${coordinatorDetails.name}</p>` +
        `<p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${coordinatorDetails.email}">${coordinatorDetails.email}</a></p>` +
        `</div>` +
        `<p>Your coordinator will contact you shortly to coordinate your medical travel schedule, local stays, and translation logs.</p>` +
        `<p>Best regards,<br/>Atithi Health Care Team</p>` +
        `</div>` +
        `</div>`;

    return sendEmail({ to: patientEmail, subject, text, html });
};

export const sendBookingCancellationEmail = async (
    patientEmail: string,
    patientName: string,
    bookingDetails: { id: string; tripTitle: string; hospitalName: string }
): Promise<boolean> => {
    const subject = `Booking Cancelled: ${bookingDetails.tripTitle}`;
    
    const text = `Hello ${patientName},\n\n` +
        `We are writing to inform you that your booking for the medical travel package "${bookingDetails.tripTitle}" has been CANCELLED.\n\n` +
        `Booking Details:\n` +
        `- Booking ID: ${bookingDetails.id}\n` +
        `- Hospital: ${bookingDetails.hospitalName}\n\n` +
        `If you did not request this cancellation or have any questions, please contact Atithi Health Support immediately.\n\n` +
        `Best regards,\n` +
        `Atithi Health Care Team`;

    const html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">` +
        `<div style="background-color: #dc2626; padding: 20px; text-align: center; color: #ffffff;">` +
        `<h2 style="margin: 0;">Booking Cancelled</h2>` +
        `</div>` +
        `<div style="padding: 24px;">` +
        `<p>Hello <strong>${patientName}</strong>,</p>` +
        `<p>We are writing to inform you that your booking for the medical travel package <strong>${bookingDetails.tripTitle}</strong> has been <strong>CANCELLED</strong>.</p>` +
        `<div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">` +
        `<h3 style="margin-top: 0; color: #dc2626;">Booking Details</h3>` +
        `<table style="width: 100%; border-collapse: collapse;">` +
        `<tr><td style="padding: 4px 0; font-weight: bold; width: 140px;">Booking ID:</td><td style="padding: 4px 0;">${bookingDetails.id}</td></tr>` +
        `<tr><td style="padding: 4px 0; font-weight: bold;">Hospital:</td><td style="padding: 4px 0;">${bookingDetails.hospitalName}</td></tr>` +
        `</table>` +
        `</div>` +
        `<p>If you did not request this cancellation or have any questions, please contact the hospital support coordinator team immediately.</p>` +
        `<p>Best regards,<br/>Atithi Health Care Team</p>` +
        `</div>` +
        `</div>`;

    return sendEmail({ to: patientEmail, subject, text, html });
};
