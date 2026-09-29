'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const { sendVerificationEmail } = require('../utils/mailer'); // We can use the transporter from mailer.js directly
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Simple in-memory rate limiter
const rateLimit = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const userRecord = rateLimit.get(ip);

  if (!userRecord) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (now > userRecord.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userRecord.count >= MAX_REQUESTS) {
    return false;
  }

  userRecord.count++;
  return true;
}

// Reusing nodemailer config from mailer.js via env vars
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

router.post('/', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  // Basic email validation
  if (!email.includes('@') || email.length < 5) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (message.length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters long.' });
  }

  try {
    const db = getDb();
    
    // Ensure contact_messages table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        subject TEXT,
        message TEXT,
        created_at TEXT
      )
    `);

    const msgId = `msg_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare('INSERT INTO contact_messages (id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(msgId, name, email, subject || 'No Subject', message, now);

    // Send email
    try {
      await transporter.sendMail({
        from: `"${name}" <${process.env.SMTP_USER || 'noreply@dogfood.com'}>`,
        to: process.env.SMTP_USER || 'admin@dogfood.com',
        replyTo: email,
        subject: `New Contact Form Submission: ${subject || 'No Subject'}`,
        text: `You have received a new message from ${name} (${email}):\n\n${message}`
      });
    } catch (mailErr) {
      console.error('[contact] Mailer error (db saved):', mailErr.message);
      // We don't fail the request if just the email fails, since it's saved in DB
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('[contact] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
