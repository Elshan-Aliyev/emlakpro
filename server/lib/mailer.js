const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const enabled = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter;
if (enabled) {
  transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const FROM = SMTP_FROM || `EmlakPro <no-reply@emlakpro.az>`;
// Read at call time so CLIENT_URL set after module load is respected
const getBase = () => (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

async function send(options) {
  if (!enabled) return;
  try {
    await transporter.sendMail({ from: FROM, ...options });
  } catch (err) {
    console.error('[mailer] send error:', err.message);
  }
}

exports.sendInquiryNotification = ({ sellerEmail, sellerName, buyerName, propertyTitle, messagePreview }) =>
  send({
    to:      sellerEmail,
    subject: `New inquiry on "${propertyTitle}"`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:#0F766E;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">EmlakPro</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#374151;">Hi ${sellerName || 'there'},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            You have a new inquiry on <strong>${propertyTitle}</strong>.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">From</p>
            <p style="margin:0 0 14px;font-size:14px;color:#111827;font-weight:500;">${buyerName || 'A potential buyer'}</p>
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Message preview</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${messagePreview}</p>
          </div>
          <a href="${getBase()}/messages" style="display:inline-block;background:#0F766E;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            View in Messages
          </a>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            You are receiving this because you have a listing on EmlakPro.<br>
            To adjust notification preferences, visit your account settings.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });

exports.sendPasswordReset = ({ toEmail, resetUrl }) =>
  send({
    to:      toEmail,
    subject: 'Reset your EmlakPro password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:#0F766E;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">EmlakPro</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            We received a request to reset the password for your EmlakPro account.<br>
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#0F766E;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            Reset my password
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
            If you did not request a password reset, you can safely ignore this email.
            Your password will not change.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            If the button doesn't work, copy this link: ${resetUrl}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });

exports.isEnabled = enabled;
