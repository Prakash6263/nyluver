#!/usr/bin/env node
// Email delivery diagnostic for the Nyluver backend.
//
// Usage (from the repo root):
//   node --env-file=.env scripts/check-smtp.mjs                  # show config + SMTP handshake
//   node --env-file=.env scripts/check-smtp.mjs you@example.com  # ...and send a test message
//
// Reads the same variables as server/mailer.ts and exits with a non-zero code
// when codes cannot be delivered, so it can also be wired into a deploy check.

import nodemailer from 'nodemailer';

const to = process.argv[2];

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;

const API_URL = process.env.EMAIL_API_URL;
const API_KEY = process.env.EMAIL_API_KEY;
const FROM = process.env.EMAIL_FROM || 'Nyluver <no-reply@nyluver.com>';

const smtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
const apiConfigured = !!(API_URL && API_KEY);

function line(label, value) {
  console.log(label.padEnd(16) + ' ' + value);
}

console.log('Nyluver email diagnostic');
console.log('');
line('Transport:', smtpConfigured ? 'SMTP' : apiConfigured ? 'HTTP API' : 'none');
line('From:', FROM);
line('DEFAULT_OTP:', process.env.DEFAULT_OTP || '(not set - codes are random)');

if (smtpConfigured) {
  line('SMTP host:', SMTP_HOST + ':' + SMTP_PORT + ' (secure=' + SMTP_SECURE + ')');
  line('SMTP user:', SMTP_USER);
}
if (apiConfigured) {
  line('API URL:', API_URL);
}

if (!smtpConfigured && !apiConfigured) {
  console.error('');
  console.error('FAIL: no email transport configured. Verification codes are NOT emailed');
  console.error('      to users - they are only printed to the server log, and the API');
  console.error('      answers with emailSent:false. Add SMTP_HOST / SMTP_PORT /');
  console.error('      SMTP_USER / SMTP_PASS (or EMAIL_API_URL / EMAIL_API_KEY) to .env');
  console.error('      and restart the server.');
  process.exit(1);
}

if (smtpConfigured) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.verify();
    console.log('');
    console.log('OK: SMTP handshake and authentication succeeded.');
  } catch (error) {
    console.error('');
    console.error('FAIL: SMTP connection failed - ' + error.message);
    process.exit(1);
  }

  if (!to) {
    console.log('    Pass an email address as an argument to send a real test message.');
  } else {
    try {
      const info = await transporter.sendMail({
        from: FROM,
        to,
        subject: 'Nyluver SMTP test',
        text: 'SMTP is working. Verification codes will reach user inboxes.',
      });
      console.log('OK: test email accepted for ' + to + ' (' + info.messageId + ')');
      console.log('    Check the inbox and the spam folder.');
    } catch (error) {
      console.error('FAIL: test email rejected - ' + error.message);
      process.exit(1);
    }
  }
} else if (to) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: 'Nyluver email test',
      text: 'The email API is working.',
    }),
  });
  if (response.ok) {
    console.log('');
    console.log('OK: email API accepted the test message for ' + to);
  } else {
    console.error('');
    console.error('FAIL: email API returned ' + response.status + ' - ' + (await response.text()));
    process.exit(1);
  }
}