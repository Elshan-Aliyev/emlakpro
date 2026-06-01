const twilio = require('twilio');

const sid   = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const isConfigured = sid && sid.startsWith('AC') && token && verifyServiceSid;

const client = isConfigured ? twilio(sid, token) : null;

if (!isConfigured) {
  console.warn('[Twilio] Credentials not configured — phone verification disabled.');
}

module.exports = { client, verifyServiceSid, isConfigured };
