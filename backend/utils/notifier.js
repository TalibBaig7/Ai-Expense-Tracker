import nodemailer from "nodemailer";

const isProd = process.env.NODE_ENV === "production";

let transporter;
const getTransporter = () => {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

const notConfigured = (kind, to, text) => {
  if (isProd) {
    const err = new Error(`${kind} delivery is not configured on the server`);
    err.code = "DELIVERY_NOT_CONFIGURED";
    throw err;
  }
  // Dev fallback so the flow can be tested without real credentials.
  console.warn(`[notifier] ${kind} not configured. Would send to ${to}: ${text}`);
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const t = getTransporter();
  if (!t) return notConfigured("Email", to, text);
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};
