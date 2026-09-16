// ============================================================
//  server.js  –  Sathish Kumar Portfolio Backend
//  Primary Email  → Gmail SMTP via Nodemailer
//  Backup / Alert → EmailJS REST API
// ============================================================

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
//  STARTUP: validate required env vars
// ─────────────────────────────────────────────────────────────
const REQUIRED = {
  EMAIL_USER          : 'sathish292003@gmail.com',
  EMAIL_PASS          : 'nksy ftjp oqke csme',
  OWNER_EMAIL         : 'sathish292003@gmail.com',
  EMAILJS_SERVICE_ID  : 'service_zmrvdza',
  EMAILJS_TEMPLATE_ID : 'template_xyz7890',
  EMAILJS_PUBLIC_KEY  : 'qpFRmCM0jmDglC8xU',
  EMAILJS_PRIVATE_KEY : '3YffpForaPB559Ya9ArO3'
};

let configOk = true;
console.log('\n──────────────────────────────────────────');
console.log('  Checking .env configuration…');
console.log('──────────────────────────────────────────');
for (const [key, hint] of Object.entries(REQUIRED)) {
  const val = process.env[key];
  if (!val || val.trim() === '' || val.includes('your_') || /X{4,}/i.test(val)) {
    console.warn(`⚠️  MISSING  ${key}`);
    console.warn(`            ${hint}`);
    configOk = false;
  } else {
    const masked = val.length > 6 ? val.slice(0, 4) + '****' + val.slice(-4) : '****';
    console.log(`✅  ${key.padEnd(22)} ${masked}`);
  }
}
console.log('──────────────────────────────────────────');
if (!configOk) {
  console.warn('\n⚠️  Fix the missing values in .env, then restart: npm start\n');
} else {
  console.log('\n✅  All credentials set — ready!\n');
}

// ─────────────────────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true,
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '32kb' }));

// Rate limiting: max 5 requests per 10 minutes per IP
const contactHits = new Map();
const RATE_WINDOW = 10 * 60 * 1000;
const RATE_MAX = 5;

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of contactHits.entries()) {
    const active = timestamps.filter(t => now - t < RATE_WINDOW);
    if (active.length === 0) contactHits.delete(ip);
    else contactHits.set(ip, active);
  }
}, 15 * 60 * 1000);

app.use('/api/contact', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const hits = (contactHits.get(ip) || []).filter(t => now - t < RATE_WINDOW);

  if (hits.length >= RATE_MAX) {
    return res.status(429).json({ success: false, error: 'Too many messages. Please try again later.' });
  }

  hits.push(now);
  contactHits.set(ip, hits);
  next();
});

app.use(express.static(__dirname));

// ─────────────────────────────────────────────────────────────
//  Gmail transporter (port 465 SSL)
// ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host  : 'smtp.gmail.com',
  port  : 465,
  secure: true,
  auth  : {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────────────────────
//  Helper: HTML escape
// ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────
//  POST /api/contact
// ─────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  const clean = value => String(value ?? '').trim();
  const safeName    = clean(name);
  const safeEmail   = clean(email);
  const safeSubject = clean(subject);
  const safeMessage = clean(message);

  if (!safeName || !safeEmail || !safeSubject || !safeMessage) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }
  if (safeName.length > 80 || safeSubject.length > 160 || safeMessage.length > 5000) {
    return res.status(400).json({ success: false, error: 'One or more fields are too long.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  let gmailSent   = false;
  let emailJsSent = false;
  const errors    = [];
  const timeIST   = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // ── 1. Primary: Nodemailer (Gmail) ──────────────────────────
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.OWNER_EMAIL) {
      throw new Error('Gmail service is not configured.');
    }
    await transporter.sendMail({
      from    : `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to      : process.env.OWNER_EMAIL,
      replyTo : safeEmail,
      subject : `📩 New Portfolio Message: ${safeSubject}`,
      html    : `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;
            background:#0a0a1a;color:#fff;border-radius:12px;
            overflow:hidden;border:2px solid #00ff88;">
  <div style="background:linear-gradient(135deg,#00ff88,#ffd633);padding:24px;text-align:center;">
    <h2 style="margin:0;color:#000;font-size:22px;letter-spacing:1px;">📬 NEW CONTACT MESSAGE</h2>
    <p style="margin:6px 0 0;color:#000;font-size:14px;">From your Portfolio Website</p>
  </div>
  <div style="padding:30px;">
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr>
        <td style="padding:10px 0;color:#00ff88;font-weight:600;width:90px;">Name</td>
        <td style="padding:10px 0;">${escapeHtml(safeName)}</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.1);">
        <td style="padding:10px 0;color:#00ff88;font-weight:600;">Email</td>
        <td style="padding:10px 0;"><a href="mailto:${escapeHtml(safeEmail)}" style="color:#ffd633;">${escapeHtml(safeEmail)}</a></td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.1);">
        <td style="padding:10px 0;color:#00ff88;font-weight:600;">Subject</td>
        <td style="padding:10px 0;">${escapeHtml(safeSubject)}</td>
      </tr>
    </table>
    <div style="margin-top:20px;padding:20px;background:rgba(0,255,136,0.06);border-radius:8px;border-left:3px solid #00ff88;">
      <p style="margin:0 0 8px;color:#00ff88;font-weight:600;">Message</p>
      <p style="margin:0;color:#ddd;line-height:1.8;white-space:pre-wrap;">${escapeHtml(safeMessage)}</p>
    </div>
  </div>
  <div style="background:rgba(0,0,0,0.3);padding:14px;text-align:center;font-size:12px;color:#777;">
    © Portfolio &nbsp;|&nbsp; Received at ${timeIST} IST
  </div>
</div>`,
    });
    gmailSent = true;
    console.log(`✅ Gmail → ${process.env.OWNER_EMAIL}`);
  } catch (err) {
    console.error('❌ Gmail error:', err.message);
    errors.push('Gmail failed: ' + err.message);
  }

  // ── 2. Secondary: EmailJS REST API ──────────────────────────
  try {
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS service is not configured.');
    }

    const emailJsPayload = {
      service_id  : process.env.EMAILJS_SERVICE_ID,
      template_id : process.env.EMAILJS_TEMPLATE_ID,
      user_id     : process.env.EMAILJS_PUBLIC_KEY,
      accessToken : process.env.EMAILJS_PRIVATE_KEY, // required if private key verification is enabled
      template_params: {
        from_name : safeName,
        from_email: safeEmail,
        subject   : safeSubject,
        message   : safeMessage,
        time_ist  : timeIST,
      },
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(emailJsPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`EmailJS responded with ${response.status}: ${errText}`);
    }

    emailJsSent = true;
    console.log('✅ EmailJS notification sent successfully');
  } catch (err) {
    console.error('❌ EmailJS error:', err.message);
    errors.push('EmailJS failed: ' + err.message);
  }

  // ── Response ────────────────────────────────────────────────
  if (gmailSent || emailJsSent) {
    return res.status(200).json({ success: true, gmailSent, emailJsSent, errors });
  }

  return res.status(500).json({
    success: false,
    error  : 'Both notification services failed. Check server logs.',
    details: errors,
  });
});

// ─────────────────────────────────────────────────────────────
//  GET /api/health
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time  : new Date().toISOString(),
    config: {
      gmail   : !!(process.env.EMAIL_USER && process.env.EMAIL_PASS) ? '✅' : '❌ missing',
      emailjs : !!(process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_PUBLIC_KEY) ? '✅' : '❌ missing',
    },
  });
});

// ─────────────────────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Server  → http://localhost:${PORT}`);
  console.log(`📬  API     → POST http://localhost:${PORT}/api/contact`);
  console.log(`🌐  Site    → http://localhost:${PORT}/portfolio.html\n`);
});