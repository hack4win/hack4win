import nodemailer, { type SendMailOptions } from "nodemailer";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailSender {
  email: string;
  name: string;
}

export interface SendEmailOptions {
  to: EmailRecipient[] | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: EmailSender;
  replyTo?: { email: string; name?: string };
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  tags?: string[];
  engine?: "brevo_api" | "brevo_smtp" | "auto";
  isCampaign?: boolean;
  campaignId?: string;
  unsubscribeUrl?: string;
  headers?: Record<string, string>;
  forceLive?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  engineUsed: "brevo_api" | "brevo_smtp" | "simulated";
  response?: unknown;
  warning?: string;
  isIpRestricted?: boolean;
  guidanceUrl?: string;
}

export interface BrevoErrorAnalysis {
  isIpRestricted: boolean;
  detectedIp?: string;
  guidanceMessage?: string;
  guidanceUrl: string;
  rawError: string;
}

/**
 * Verified Sender Identities on domain hack4win.online (DKIM & DMARC active)
 */
export const HACK4WIN_SENDERS = {
  NEWS: { name: "Hack4Win News", email: "news@hack4win.online" },
  REQUESTS: { name: "Hack4Win Requests", email: "request@hack4win.online" },
  WELCOME: { name: "Hack4Win Welcome", email: "welcome@hack4win.online" },
  NOTIFICATIONS: { name: "Hack4Win Notifications", email: "notifications@hack4win.online" },
  SUPPORT: { name: "Hack4Win Support", email: "support@hack4win.online" },
} as const;

export const DEFAULT_SENDER: EmailSender = {
  name: process.env.DEFAULT_SENDER_NAME || HACK4WIN_SENDERS.WELCOME.name,
  email: process.env.DEFAULT_SENDER_EMAIL || HACK4WIN_SENDERS.WELCOME.email,
};

export const DEFAULT_REPLY_TO = {
  name: "Hack4Win Support",
  email: process.env.DEFAULT_REPLY_TO || HACK4WIN_SENDERS.SUPPORT.email,
};

const BREVO_API_KEY =
  process.env.BREVO_API_KEY ||
  "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";

const SMTP_CONFIG = {
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  user: process.env.BREVO_SMTP_USER || "a25f05001@smtp-brevo.com",
  pass:
    process.env.BREVO_SMTP_PASS ||
    "xsmtpsib-0fba7c0ddaa7b74993cfc5542e5024e3788d2add510141ce1fd62f336fc8f8d2-mB3NCX4H4j9oYId5",
};

/**
 * Checks whether an email address is a test, mock, dummy, or temporary address.
 * Prevents exhausting daily Brevo SMTP/API quota (300 emails/day cap) on testing.
 */
export function isTestOrDummyEmail(email: string): boolean {
  if (!email || typeof email !== "string") return true;
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return true;

  const [localPart, domain] = clean.split("@");
  if (!domain || !localPart) return true;

  // Domains used in automated tests or throwaways
  const testDomains = [
    "example.com",
    "example.org",
    "example.net",
    "test.com",
    "test.org",
    "test.net",
    "platform.io",
    "localhost",
    "local",
    "invalid",
    "do4win.com",
    "mailinator.com",
    "tempmail.com",
    "throwawaymail.com",
    "guerrillamail.com",
    "yopmail.com",
  ];
  if (
    testDomains.includes(domain) ||
    domain.endsWith(".test") ||
    domain.endsWith(".example") ||
    domain.endsWith(".localhost") ||
    domain.endsWith(".invalid")
  ) {
    return true;
  }

  // Common test patterns in the local part of the email address
  const testPatterns = [
    /^test(?:_|-|\.|$)/,
    /(?:_|-|\.)test$/,
    /^dummy(?:_|-|\.|$)/,
    /^mock(?:_|-|\.|$)/,
    /^e2e(?:_|-|\.|$)/,
    /^collab\d*(?:_|-|\.|$)/,
    /^fake(?:_|-|\.|$)/,
    /^sample(?:_|-|\.|$)/,
    /^brevo_(?:admin|user|tester)/,
    /^testuser\d*$/,
    /^test_recipient/,
    /^builder(?:_|-|\.|$)/,
    /^participant\d*(?:_|-|\.|$)/,
    /^someone(?:_|-|\.|$)/,
    /^audience(?:_|-|\.|$)/,
  ];

  return testPatterns.some((p) => p.test(localPart));
}

/**
 * Evaluates whether an email dispatch should be simulated to protect Brevo quota.
 * Real emails are NEVER dispatched if:
 * 1. Running in automated test suites (NODE_ENV=test, node:test runner, or DISABLE_REAL_EMAILS=true)
 * 2. In non-production development without explicit ENABLE_REAL_EMAILS=true
 * 3. All target recipients are test/dummy addresses
 */
export function shouldSimulateEmail(
  recipients?: (string | EmailRecipient)[],
  options?: { subject?: string; tags?: string[]; forceLive?: boolean }
): {
  simulate: boolean;
  reason?: string;
} {
  // If explicitly forced live (e.g. from Admin Settings test email tool), bypass simulation
  if (options?.forceLive) {
    return { simulate: false };
  }
  // Explicit kill-switch or test flags
  if (
    process.env.DISABLE_REAL_EMAILS === "true" ||
    process.env.MOCK_EMAILS === "true" ||
    process.env.NEXT_PUBLIC_DISABLE_EMAILS === "true"
  ) {
    return {
      simulate: true,
      reason: "Real emails disabled by environment configuration (DISABLE_REAL_EMAILS=true).",
    };
  }

  // Safety: If subject or tags indicate an automated test, E2E run, or benchmark, NEVER send real email
  const subjectLower = (options?.subject || "").toLowerCase();
  if (
    subjectLower.startsWith("e2e") ||
    subjectLower.includes("[test]") ||
    subjectLower.includes("e2e announcement") ||
    subjectLower.includes("automated test") ||
    options?.tags?.some((t) => t.toLowerCase().includes("test") || t.toLowerCase().includes("e2e"))
  ) {
    return {
      simulate: true,
      reason: "Test or E2E subject/tag pattern detected. Simulated to prevent sending test emails to users.",
    };
  }

  // Automated test environment detection
  const isTestEnvironment =
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.argv.some((arg) => arg.includes("test") || arg.includes(".test."));

  if (isTestEnvironment) {
    return {
      simulate: true,
      reason: "Automated test environment detected. Dispatches are simulated to preserve Brevo quota.",
    };
  }

  // Non-production development: Require explicit opt-in via ENABLE_REAL_EMAILS="true"
  const isProduction = (process.env.NODE_ENV as string) === "production";
  const realEmailsEnabled = process.env.ENABLE_REAL_EMAILS === "true";

  if (!isProduction && !realEmailsEnabled) {
    return {
      simulate: true,
      reason: `Development mode active (${process.env.NODE_ENV || "development"}). Simulated to preserve Brevo quota. Set ENABLE_REAL_EMAILS=true to dispatch live emails.`,
    };
  }

  // If recipients provided, check if all are dummy/test emails
  if (recipients && recipients.length > 0) {
    const rawEmails = recipients.map((r) => (typeof r === "string" ? r : r.email));
    const allDummy = rawEmails.every((email) => isTestOrDummyEmail(email));
    if (allDummy) {
      return {
        simulate: true,
        reason: "All recipients are test/dummy email addresses. Simulated to preserve Brevo quota.",
      };
    }
  }

  return { simulate: false };
}

/**
 * Helper to analyze Brevo errors for IP restriction (525 / unrecognised IP)
 */
export function analyzeBrevoError(error: unknown): BrevoErrorAnalysis {
  const message = error instanceof Error ? error.message : String(error);
  const is525 = message.includes("525") || message.includes("5.7.1 Unauthorized IP address");
  const isUnauthorizedIp =
    message.toLowerCase().includes("unrecognised ip") ||
    message.toLowerCase().includes("unrecognized ip") ||
    message.toLowerCase().includes("unauthorized ip");

  if (is525 || isUnauthorizedIp) {
    const ipMatch = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const detectedIp = ipMatch ? ipMatch[0] : undefined;
    return {
      isIpRestricted: true,
      detectedIp,
      guidanceUrl: "https://app.brevo.com/security/authorised_ips",
      guidanceMessage:
        `Brevo IP Security Restriction: The current server IP${detectedIp ? ` (${detectedIp})` : ""} ` +
        `is not authorized in Brevo. To enable email sending, please disable the IP restriction or whitelist this IP ` +
        `at https://app.brevo.com/security/authorised_ips`,
      rawError: message,
    };
  }

  return {
    isIpRestricted: false,
    guidanceUrl: "https://app.brevo.com/security/authorised_ips",
    rawError: message,
  };
}

/**
 * 1. Send via Brevo REST API v3 (Direct HTTPS: https://api.brevo.com/v3/smtp/email)
 */
export async function sendViaBrevoApi(options: SendEmailOptions): Promise<SendEmailResult> {
  const simCheck = shouldSimulateEmail(options.to, {
    subject: options.subject,
    tags: options.tags,
    forceLive: options.forceLive,
  });
  if (simCheck.simulate) {
    console.log(`🛡️ [EMAIL QUOTA PROTECTED] (Brevo API simulated): ${simCheck.reason}`);
    return {
      success: true,
      messageId: `simulated_api_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      engineUsed: "simulated",
      warning: `[Simulated] ${simCheck.reason}`,
      response: { dispatched: false, simulated: true, reason: simCheck.reason },
    };
  }

  const recipients = options.to.map((r) => (typeof r === "string" ? { email: r } : r));
  const sender = options.sender || DEFAULT_SENDER;

  const payload: Record<string, unknown> = {
    sender,
    to: recipients,
    subject: options.subject,
    htmlContent: options.htmlContent,
  };

  if (options.textContent) {
    payload.textContent = options.textContent;
  }
  if (options.replyTo) {
    payload.replyTo = options.replyTo;
  } else {
    payload.replyTo = DEFAULT_REPLY_TO;
  }
  if (options.cc && options.cc.length > 0) {
    payload.cc = options.cc;
  }
  if (options.bcc && options.bcc.length > 0) {
    payload.bcc = options.bcc;
  }
  if (options.tags && options.tags.length > 0) {
    payload.tags = options.tags;
  }
  if (options.headers) {
    payload.headers = options.headers;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || `Brevo API error HTTP ${response.status}`;
    const analysis = analyzeBrevoError(errorMsg);
    if (analysis.isIpRestricted) {
      console.warn(`⚠️ [Brevo REST API]: ${analysis.guidanceMessage}`);
    }
    const err = new Error(analysis.guidanceMessage || errorMsg);
    (err as unknown as { brevoAnalysis: BrevoErrorAnalysis }).brevoAnalysis = analysis;
    throw err;
  }

  return {
    success: true,
    messageId: (data.messageId as string) || (data.id as string) || `brevo_api_${Date.now()}`,
    engineUsed: "brevo_api",
    response: data,
  };
}

/**
 * 2. Send via Brevo SMTP Relay (Nodemailer, smtp-relay.brevo.com:587 STARTTLS)
 */
export async function sendViaBrevoSmtp(options: SendEmailOptions): Promise<SendEmailResult> {
  const simCheck = shouldSimulateEmail(options.to, {
    subject: options.subject,
    tags: options.tags,
    forceLive: options.forceLive,
  });
  if (simCheck.simulate) {
    console.log(`🛡️ [EMAIL QUOTA PROTECTED] (Brevo SMTP simulated): ${simCheck.reason}`);
    return {
      success: true,
      messageId: `simulated_smtp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      engineUsed: "simulated",
      warning: `[Simulated] ${simCheck.reason}`,
      response: { dispatched: false, simulated: true, reason: simCheck.reason },
    };
  }

  const recipients = options.to.map((r) =>
    typeof r === "string" ? r : r.name ? `"${r.name}" <${r.email}>` : r.email
  );
  const sender = options.sender || DEFAULT_SENDER;

  const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.port === 465,
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions: SendMailOptions = {
    from: `"${sender.name}" <${sender.email}>`,
    to: recipients.join(", "),
    subject: options.subject,
    html: options.htmlContent,
    text: options.textContent,
  };

  if (options.replyTo) {
    mailOptions.replyTo = options.replyTo.name
      ? `"${options.replyTo.name}" <${options.replyTo.email}>`
      : options.replyTo.email;
  } else {
    mailOptions.replyTo = `"${DEFAULT_REPLY_TO.name}" <${DEFAULT_REPLY_TO.email}>`;
  }

  if (options.cc && options.cc.length > 0) {
    mailOptions.cc = options.cc.map((c) => c.email).join(", ");
  }
  if (options.bcc && options.bcc.length > 0) {
    mailOptions.bcc = options.bcc.map((b) => b.email).join(", ");
  }
  if (options.headers) {
    mailOptions.headers = options.headers;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      engineUsed: "brevo_smtp",
      response: info.response,
    };
  } catch (error) {
    const analysis = analyzeBrevoError(error);
    if (analysis.isIpRestricted) {
      console.warn(`⚠️ [Brevo SMTP Relay]: ${analysis.guidanceMessage}`);
    }
    const err = new Error(analysis.guidanceMessage || (error instanceof Error ? error.message : String(error)));
    (err as unknown as { brevoAnalysis: BrevoErrorAnalysis }).brevoAnalysis = analysis;
    throw err;
  }
}

/**
 * 3. Unified Dispatcher:
 * Tries direct REST API first; if unavailable, seamlessly falls back to SMTP Relay.
 * If both are blocked by Brevo IP security restriction, handles gracefully with diagnostics.
 * Includes quota protection to guarantee test and development runs do not consume Brevo sending limits.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // First evaluate simulation to protect quota and prevent sending test/E2E emails
  const simCheck = shouldSimulateEmail(options.to, {
    subject: options.subject,
    tags: options.tags,
    forceLive: options.forceLive,
  });
  if (simCheck.simulate) {
    console.log(`🛡️ [EMAIL QUOTA PROTECTED] sendEmail: ${simCheck.reason}`);
    console.log(`   Subject: "${options.subject}"`);
    console.log(`   Recipients: ${JSON.stringify(options.to)}`);
    return {
      success: true,
      messageId: `simulated_protected_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      engineUsed: "simulated",
      warning: `[Simulated] ${simCheck.reason}`,
      response: {
        dispatched: false,
        simulated: true,
        reason: simCheck.reason,
        recipients: options.to,
      },
    };
  }

  // Filter out any dummy emails if sending to multiple recipients in production / enabled mode
  const normalizedRecipients = options.to.map((r) =>
    typeof r === "string" ? { email: r } : r
  );
  const realRecipients = normalizedRecipients.filter((r) => !isTestOrDummyEmail(r.email));

  if (realRecipients.length === 0) {
    console.log(`🛡️ [EMAIL QUOTA PROTECTED]: All recipients are test/dummy addresses.`);
    return {
      success: true,
      messageId: `simulated_dummy_${Date.now()}`,
      engineUsed: "simulated",
      warning: "All recipients were filtered out as test/dummy addresses.",
      response: { dispatched: false, simulated: true },
    };
  }

  const effectiveOptions: SendEmailOptions = {
    ...options,
    to: realRecipients,
  };

  const engine = effectiveOptions.engine || "auto";

  // If specific engine requested
  if (engine === "brevo_api") {
    try {
      return await sendViaBrevoApi(effectiveOptions);
    } catch (err) {
      const analysis = analyzeBrevoError(err);
      // If failed, attempt SMTP fallback
      console.log(`[Brevo API failed, attempting SMTP fallback...]: ${analysis.rawError}`);
      try {
        return await sendViaBrevoSmtp(effectiveOptions);
      } catch (smtpErr) {
        return handleAllEnginesFailed(err, smtpErr, effectiveOptions);
      }
    }
  }

  if (engine === "brevo_smtp") {
    try {
      return await sendViaBrevoSmtp(effectiveOptions);
    } catch (err) {
      const analysis = analyzeBrevoError(err);
      console.log(`[Brevo SMTP failed, attempting API fallback...]: ${analysis.rawError}`);
      try {
        return await sendViaBrevoApi(effectiveOptions);
      } catch (apiErr) {
        return handleAllEnginesFailed(apiErr, err, effectiveOptions);
      }
    }
  }

  // Engine: "auto" (Try API first, then SMTP fallback)
  try {
    return await sendViaBrevoApi(effectiveOptions);
  } catch (apiErr) {
    const analysis = analyzeBrevoError(apiErr);
    console.log(`[Brevo Auto Dispatcher: API unready, attempting SMTP relay...]: ${analysis.rawError}`);
    try {
      return await sendViaBrevoSmtp(effectiveOptions);
    } catch (smtpErr) {
      return handleAllEnginesFailed(apiErr, smtpErr, effectiveOptions);
    }
  }
}

/**
 * Fallback handler when both API and SMTP encounters errors
 */
function handleAllEnginesFailed(
  apiError: unknown,
  smtpError: unknown,
  options: SendEmailOptions
): SendEmailResult {
  const apiAnalysis = analyzeBrevoError(apiError);
  const smtpAnalysis = analyzeBrevoError(smtpError);
  const isIpRestricted = apiAnalysis.isIpRestricted || smtpAnalysis.isIpRestricted;
  const detectedIp = apiAnalysis.detectedIp || smtpAnalysis.detectedIp;

  const guidanceMsg = isIpRestricted
    ? `Brevo IP Security Restriction: The current IP${detectedIp ? ` (${detectedIp})` : ""} is not whitelisted. ` +
      `Disable IP restriction at https://app.brevo.com/security/authorised_ips to enable live delivery.`
    : `Brevo dispatch failed: ${apiAnalysis.rawError}`;

  console.warn(`\n======================================================`);
  console.warn(`📨 [HACK4WIN EMAIL DISPATCHER NOTICE]:`);
  console.warn(`Subject: "${options.subject}"`);
  console.warn(`Recipient(s): ${JSON.stringify(options.to)}`);
  console.warn(`Status: ${guidanceMsg}`);
  console.warn(`======================================================\n`);

  // In development/test mode, prevent crashes due to Brevo IP authorization requirement
  if (process.env.NODE_ENV !== "production") {
    return {
      success: true,
      messageId: `simulated_dev_${Date.now()}`,
      engineUsed: "simulated",
      warning: guidanceMsg,
      isIpRestricted,
      guidanceUrl: "https://app.brevo.com/security/authorised_ips",
      response: {
        dispatched: false,
        simulated: true,
        reason: guidanceMsg,
      },
    };
  }

  const err = new Error(guidanceMsg);
  (err as unknown as { isIpRestricted: boolean; guidanceUrl: string }).isIpRestricted = isIpRestricted;
  (err as unknown as { isIpRestricted: boolean; guidanceUrl: string }).guidanceUrl =
    "https://app.brevo.com/security/authorised_ips";
  throw err;
}

/**
 * 4. Verify Brevo SMTP Handshake
 */
export async function verifySmtpConnection(): Promise<{
  ok: boolean;
  message: string;
  isIpRestricted?: boolean;
  detectedIp?: string;
  guidanceUrl?: string;
}> {
  const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.port === 465,
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.verify();
    return {
      ok: true,
      message: "Brevo SMTP Relay connection established successfully (Port 587 STARTTLS)",
    };
  } catch (error) {
    const analysis = analyzeBrevoError(error);
    return {
      ok: false,
      message: analysis.guidanceMessage || (error instanceof Error ? error.message : String(error)),
      isIpRestricted: analysis.isIpRestricted,
      detectedIp: analysis.detectedIp,
      guidanceUrl: analysis.guidanceUrl,
    };
  }
}

/**
 * 5. Verify Brevo REST API Handshake
 */
export async function verifyApiConnection(): Promise<{
  ok: boolean;
  message: string;
  account?: unknown;
  isIpRestricted?: boolean;
  detectedIp?: string;
  guidanceUrl?: string;
}> {
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.message || `Brevo API returned status ${res.status}`;
      const analysis = analyzeBrevoError(errorMsg);
      return {
        ok: false,
        message: analysis.guidanceMessage || errorMsg,
        isIpRestricted: analysis.isIpRestricted,
        detectedIp: analysis.detectedIp,
        guidanceUrl: analysis.guidanceUrl,
      };
    }

    return {
      ok: true,
      message: `Brevo REST API verified (Account: ${data.email || data.companyName || "Active"})`,
      account: data,
    };
  } catch (error) {
    const analysis = analyzeBrevoError(error);
    return {
      ok: false,
      message: analysis.guidanceMessage || (error instanceof Error ? error.message : String(error)),
      isIpRestricted: analysis.isIpRestricted,
      detectedIp: analysis.detectedIp,
      guidanceUrl: analysis.guidanceUrl,
    };
  }
}

/**
 * 6. Comprehensive Email Service Health Check
 */
export async function verifyEmailService(): Promise<{
  status: "connected" | "ip_restricted" | "error";
  smtp: { ok: boolean; message: string };
  api: { ok: boolean; message: string };
  isIpRestricted: boolean;
  detectedIp?: string;
  guidanceUrl: string;
}> {
  const [smtpRes, apiRes] = await Promise.all([
    verifySmtpConnection(),
    verifyApiConnection(),
  ]);

  const isIpRestricted = Boolean(smtpRes.isIpRestricted || apiRes.isIpRestricted);
  const detectedIp = smtpRes.detectedIp || apiRes.detectedIp;

  let status: "connected" | "ip_restricted" | "error" = "error";
  if (smtpRes.ok || apiRes.ok) {
    status = "connected";
  } else if (isIpRestricted) {
    status = "ip_restricted";
  }

  return {
    status,
    smtp: { ok: smtpRes.ok, message: smtpRes.message },
    api: { ok: apiRes.ok, message: apiRes.message },
    isIpRestricted,
    detectedIp,
    guidanceUrl: "https://app.brevo.com/security/authorised_ips",
  };
}

export const brevoService = {
  sendEmail,
  sendViaBrevoApi,
  sendViaBrevoSmtp,
  verifySmtpConnection,
  verifyApiConnection,
  verifyEmailService,
  analyzeBrevoError,
  isTestOrDummyEmail,
  shouldSimulateEmail,
  HACK4WIN_SENDERS,
  DEFAULT_SENDER,
  DEFAULT_REPLY_TO,
};

export default brevoService;
