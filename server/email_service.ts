import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import { saveEmailLog, updateEmailLogStatus, updateEmailLogExtended } from "./auth_db.js";

// Path to log sent emails for local debug viewing
const DEBUG_EMAILS_PATH = path.resolve(process.cwd(), "sent_emails_debug_log.json");

// Structure of an email object to log
export interface SentEmailDebug {
  id: number;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
}

// Background queue to handle sending without blocking the main event loop
const emailQueue: {
  userId: string;
  to: string;
  subject: string;
  html: string;
  type: string;
  resolve: (value: any) => void;
  reject: (err: any) => void;
}[] = [];

let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || emailQueue.length === 0) return;
  isProcessingQueue = true;

  while (emailQueue.length > 0) {
    const job = emailQueue.shift();
    if (!job) continue;

    // Save initial attempt record (Even if sending fails entirely, we must have a record in SQLite first!)
    let emailLogId = 0;
    try {
      emailLogId = await saveEmailLog(
        job.userId,
        job.type,
        job.subject,
        "SENDING",
        job.to,
        "no-reply@timehero.ai",
        "Pending",
        null,
        null,
        JSON.stringify({ to: job.to, subject: job.subject, type: job.type })
      );
    } catch (saveErr) {
      console.error("Failed to log initial email attempt:", saveErr);
    }

    try {
      // Inject tracking pixel and link wrappers
      const trackedHtml = injectTracking(job.html, emailLogId);

      let status = "FAILED";
      let errorMsg = "";
      let provider = "Dev Sandbox (Local JSON)";
      let senderEmail = "sandbox@timehero.ai";
      let providerMessageId = `sandbox-${emailLogId}-${Date.now()}`;
      let responsePayload: any = null;

      // 1. RESEND PROVIDER
      if (process.env.RESEND_API_KEY) {
        provider = "Resend";
        senderEmail = "onboarding@resend.dev";
        try {
          const isSandboxRecipient = job.to.toLowerCase() === "pradeep211397@gmail.com";
          if (!isSandboxRecipient) {
            console.log(`[Email Service] Skipping Resend for recipient '${job.to}' due to sandbox domain constraints.`);
            errorMsg = "Skipped Resend due to sandbox recipient domain limits";
          } else {
            console.log(`Sending email using Resend API to: ${job.to}`);
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "TimeHero AI <onboarding@resend.dev>",
                to: job.to,
                subject: job.subject,
                html: trackedHtml,
              }),
            });
            if (res.ok) {
              const resData = await res.json().catch(() => ({}));
              status = "SENT";
              providerMessageId = resData.id || `resend-${Date.now()}`;
              responsePayload = resData;
            } else {
              const errData = await res.text();
              throw new Error(`Resend API returned status ${res.status}: ${errData}`);
            }
          }
        } catch (err: any) {
          console.log(`[Email Service] Resend attempt failed: ${err.message || err}`);
          errorMsg += `[Resend Error: ${err.message || err}] `;
        }
      }

      // 2. SENDGRID FALLBACK PROVIDER
      if (status !== "SENT" && process.env.SENDGRID_API_KEY) {
        provider = "SendGrid";
        senderEmail = "onboarding@timehero.ai";
        try {
          console.log(`Sending email using SendGrid API to: ${job.to}`);
          const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: job.to }] }],
              from: { email: "onboarding@timehero.ai", name: "TimeHero AI" },
              subject: job.subject,
              content: [{ type: "text/html", value: trackedHtml }],
            }),
          });
          if (res.ok) {
            status = "SENT";
            providerMessageId = res.headers.get("x-message-id") || `sendgrid-${Date.now()}`;
            responsePayload = { status: "Success", headers: res.headers };
          } else {
            const errData = await res.text();
            throw new Error(`SendGrid API returned status ${res.status}: ${errData}`);
          }
        } catch (err: any) {
          console.log(`[Email Service] SendGrid attempt failed: ${err.message || err}`);
          errorMsg += `[SendGrid Error: ${err.message || err}] `;
        }
      }

      // 3. SMTP OR LOCAL FALLBACK
      if (status !== "SENT") {
        try {
          if (process.env.SMTP_HOST) {
            provider = "SMTP";
            senderEmail = "no-reply@timehero.ai";
            console.log(`Sending email using Nodemailer (SMTP Fallback) to: ${job.to}`);
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT) || 587,
              secure: process.env.SMTP_SECURE === "true",
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            });

            const info = await transporter.sendMail({
              from: '"TimeHero AI" <no-reply@timehero.ai>',
              to: job.to,
              subject: job.subject,
              html: trackedHtml,
            });
            status = "SENT";
            providerMessageId = info.messageId || `smtp-${Date.now()}`;
            responsePayload = info;
          } else {
            provider = "Dev Sandbox (Local JSON)";
            senderEmail = "sandbox@timehero.ai";
            // Write to local JSON log for debugging so the developer can easily view premium emails
            await writeToDebugEmailLog({
              id: emailLogId,
              to: job.to,
              subject: job.subject,
              html: trackedHtml,
              sentAt: new Date().toISOString(),
            });
            status = "SENT"; // Simulated delivery for review/debug
            providerMessageId = `sandbox-${emailLogId}`;
            responsePayload = { status: "Logged to sent_emails_debug_log.json" };
            console.log("Email written to debug JSON file (No SMTP configured).");
          }
        } catch (err: any) {
          console.error("All email delivery options failed:", err);
          status = "FAILED";
          errorMsg += `[Fallback Error: ${err.message || err}] `;
        }
      }

      // Update the log in database
      if (emailLogId > 0) {
        if (status === "SENT") {
          await updateEmailLogExtended(emailLogId, {
            status: "SENT",
            provider,
            senderEmail,
            providerMessageId,
            errorMessage: null,
            responsePayload: JSON.stringify(responsePayload)
          });

          // Structured Success Log
          console.log(`[EMAIL] User ID: ${job.userId} | Recipient: ${job.to} | Provider: ${provider} | Status: SENT | Message ID: ${providerMessageId} | Timestamp: ${new Date().toISOString()}`);
        } else {
          await updateEmailLogExtended(emailLogId, {
            status: "FAILED",
            provider,
            senderEmail,
            providerMessageId: null,
            errorMessage: errorMsg || "Unknown error occurred",
            responsePayload: JSON.stringify({ error: errorMsg })
          });

          // Structured Error Log
          console.warn(`[EMAIL ERROR] User ID: ${job.userId} | Recipient: ${job.to} | Provider: ${provider} | Error: ${errorMsg} | Timestamp: ${new Date().toISOString()}`);
        }
      }

      job.resolve({ success: status === "SENT", emailLogId });
    } catch (jobErr: any) {
      console.error("Queue job error:", jobErr);
      if (emailLogId > 0) {
        try {
          await updateEmailLogExtended(emailLogId, {
            status: "FAILED",
            errorMessage: jobErr.message || String(jobErr),
            responsePayload: JSON.stringify({ error: String(jobErr) })
          });
          console.warn(`[EMAIL ERROR] User ID: ${job.userId} | Recipient: ${job.to} | Provider: Unknown | Error: ${jobErr.message || String(jobErr)} | Timestamp: ${new Date().toISOString()}`);
        } catch (dbUpdateErr) {
          console.error("Could not update failed state in DB:", dbUpdateErr);
        }
      }
      job.reject(jobErr);
    }
  }

  isProcessingQueue = false;
}

// Injects tracking pixel & redirect wrappers
function injectTracking(html: string, emailLogId: number): string {
  // Try to find the App dynamic URL or use relative paths (we can rewrite links on load)
  const openTrackingPixel = `<img src="##HOST##/api/emails/track-open/${emailLogId}" width="1" height="1" style="display:none;" referrerPolicy="no-referrer" />`;
  
  let modifiedHtml = html.replace("</body>", `${openTrackingPixel}</body>`);
  if (!modifiedHtml.includes(openTrackingPixel)) {
    modifiedHtml += openTrackingPixel;
  }

  // Rewrite standard href tags to route through click tracker
  // e.g. <a href="http..." -> <a href="##HOST##/api/emails/track-click/id?redirect=http..."
  const hrefRegex = /href="([^"]+)"/g;
  modifiedHtml = modifiedHtml.replace(hrefRegex, (match, url) => {
    if (url.startsWith("http") && !url.includes("track-click")) {
      return `href="##HOST##/api/emails/track-click/${emailLogId}?redirect=${encodeURIComponent(url)}"`;
    }
    return match;
  });

  return modifiedHtml;
}

// Write to JSON debug log
async function writeToDebugEmailLog(email: SentEmailDebug) {
  try {
    let list: SentEmailDebug[] = [];
    try {
      const data = await fs.readFile(DEBUG_EMAILS_PATH, "utf-8");
      list = JSON.parse(data);
    } catch {
      // File doesn't exist
    }
    list.unshift(email);
    await fs.writeFile(DEBUG_EMAILS_PATH, JSON.stringify(list.slice(0, 50), null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to debug email log:", err);
  }
}

export async function getDebugEmails(): Promise<SentEmailDebug[]> {
  try {
    const data = await fs.readFile(DEBUG_EMAILS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Queue sending
export function sendEmailBackground(
  userId: string,
  to: string,
  subject: string,
  html: string,
  type: string
): Promise<{ success: boolean; emailLogId: number }> {
  return new Promise((resolve, reject) => {
    emailQueue.push({
      userId,
      to,
      subject,
      html,
      type,
      resolve,
      reject,
    });
    // Trigger queue processor
    processQueue();
  });
}

// HTML Premium Layout Generator
export function getPremiumEmailHtml(title: string, bodyContent: string, statsHtml = ""): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0f172a;
      color: #f1f5f9;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .header {
      padding: 30px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.05em;
      color: #ffffff;
      text-decoration: none;
      display: inline-block;
    }
    .logo span {
      color: #a78bfa;
    }
    .content {
      padding: 40px 30px;
    }
    h2 {
      margin-top: 0;
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
    }
    .stats-grid {
      margin: 30px 0;
      border-top: 1px solid #1f2937;
      border-bottom: 1px solid #1f2937;
      padding: 20px 0;
    }
    .btn-container {
      text-align: center;
      margin-top: 30px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
      color: #ffffff !important;
      font-weight: 700;
      text-decoration: none;
      border-radius: 12px;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
    .footer {
      padding: 30px;
      background-color: #0b0f19;
      border-top: 1px solid #1f2937;
      text-align: center;
      color: #4b5563;
      font-size: 12px;
    }
    .footer a {
      color: #94a3b8;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-critical {
      background-color: #ef444420;
      color: #ef4444;
      border: 1px solid #ef444430;
    }
    .badge-high {
      background-color: #f59e0b20;
      color: #f59e0b;
      border: 1px solid #f59e0b30;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header" style="padding: 24px;">
        <a href="##HOST##" style="display: inline-block; text-decoration: none;">
          <img src="##HOST##/branding/logo.png" alt="TimeHero AI Logo" style="height: 54px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />
        </a>
      </div>
      <div class="content">
        ${bodyContent}
        ${statsHtml}
        <div class="btn-container">
          <a href="##HOST##" class="btn">Open TimeHero AI</a>
        </div>
      </div>
      <div class="footer">
        <p>You received this email because notification preferences are enabled for your account.</p>
        <p>&copy; 2026 TimeHero AI. Built with Gemini & SQLite.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
