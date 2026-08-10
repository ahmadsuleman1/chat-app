import nodemailer from "nodemailer";

// Real SMTP transporter. No fake/dummy email sending - actual mail is
// dispatched through whatever SMTP provider is configured in .env
// (Gmail app password, SendGrid, Mailgun, Brevo, etc).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (email, name, verificationUrl) => {
  await sendEmail({
    to: email,
    subject: "Verify your Ring Chat account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Welcome to Ring Chat, ${name}!</h2>
        <p>Please confirm this is your real email address by clicking the button below. This link expires in 15 minutes.</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${verificationUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Verify Email
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>If you didn't create a Ring Chat account, you can ignore this email.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email, name, resetUrl) => {
  await sendEmail({
    to: email,
    subject: "Reset your Ring Chat password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Reset your password</h2>
        <p>Hi ${name}, we received a request to reset your Ring Chat password. This link expires in 15 minutes.</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>If you didn't request this, you can safely ignore this email — your password will stay the same.</p>
      </div>
    `,
  });
};
