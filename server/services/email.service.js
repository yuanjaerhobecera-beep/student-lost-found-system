import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { escapeHtml } from "../utils/escapeHtml.js";

let transporter = null;

export const isEmailConfigured = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
};

const layout = (title, bodyHtml) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#1e3a5f;color:#fff;padding:16px 24px;font-size:18px;font-weight:bold">Student Lost and Found</div>
    <div style="padding:24px;color:#1f2937;line-height:1.6">
      <h2 style="margin-top:0;font-size:20px">${escapeHtml(title)}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:12px 24px;background:#f3f4f6;color:#6b7280;font-size:12px">
      This is an automated message. Please do not reply.
    </div>
  </div>`;

const button = (url, label) =>
  `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">${escapeHtml(label)}</a></p>
   <p style="font-size:12px;color:#6b7280">If the button doesn't work, copy this link:<br>${escapeHtml(url)}</p>`;

// Sends an email. If SMTP is not set up yet, prints the email in the terminal instead
// so you can still test everything during development.
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    console.log(`\n📧 [DEV EMAIL - SMTP not configured]\n   To: ${to}\n   Subject: ${subject}\n   ${text}\n`);
    return;
  }
  try {
    await getTransporter().sendMail({ from: env.emailFrom, to, subject, html, text });
  } catch (err) {
    console.error(`📧 Email to ${to} failed: ${err.message}`);
  }
};

export const sendVerificationEmail = (user, link) =>
  sendEmail({
    to: user.email,
    subject: "Verify your email address",
    text: `Hi ${user.firstName}, verify your email: ${link} (expires in 24 hours)`,
    html: layout(
      "Verify your email",
      `<p>Hi ${escapeHtml(user.firstName)},</p>
       <p>Thanks for registering. Please confirm your email address. This link expires in 24 hours.</p>
       ${button(link, "Verify Email")}`
    ),
  });

export const sendPasswordResetEmail = (user, link) =>
  sendEmail({
    to: user.email,
    subject: "Reset your password",
    text: `Hi ${user.firstName}, reset your password: ${link} (expires in 1 hour). Ignore this if you didn't request it.`,
    html: layout(
      "Reset your password",
      `<p>Hi ${escapeHtml(user.firstName)},</p>
       <p>We received a request to reset your password. This link expires in 1 hour and can only be used once.</p>
       ${button(link, "Reset Password")}
       <p>If you didn't request this, you can safely ignore this email.</p>`
    ),
  });

export const sendAccountSetupEmail = (user, link) =>
  sendEmail({
    to: user.email,
    subject: "Your Lost and Found account was created",
    text: `Hi ${user.firstName}, an administrator created a ${user.role} account for you. Set your password: ${link} (expires in 48 hours)`,
    html: layout(
      "Set up your account",
      `<p>Hi ${escapeHtml(user.firstName)},</p>
       <p>An administrator created a <b>${escapeHtml(user.role)}</b> account for you. Click below to set your password. This link expires in 48 hours.</p>
       ${button(link, "Set Password")}`
    ),
  });

export const sendNotificationEmail = (user, title, message, link) =>
  sendEmail({
    to: user.email,
    subject: title,
    text: `Hi ${user.firstName}, ${message}${link ? ` View: ${env.clientUrl}${link}` : ""}`,
    html: layout(
      title,
      `<p>Hi ${escapeHtml(user.firstName)},</p><p>${escapeHtml(message)}</p>
       ${link ? button(`${env.clientUrl}${link}`, "Open Lost and Found") : ""}`
    ),
  });
