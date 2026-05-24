import { Resend } from 'resend';
import { logger } from './logger';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = 'FrontendDevHelper <noreply@frontenddevhelper.com>';
const BASE_URL = process.env.NEXTAUTH_URL || 'https://frontenddevhelper.com';

type EmailResult = { success: true; id: string } | { success: false; error: string };

async function send(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set — skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const { data, error } = await getResend().emails.send({ from: FROM, to, subject, html });
    if (error) {
      logger.error('Resend error:', error);
      return { success: false, error: error.message };
    }
    logger.info(`Email sent to ${to}: ${data?.id}`);
    return { success: true, id: data?.id || '' };
  } catch (err) {
    logger.error('Email send failed:', err);
    return { success: false, error: String(err) };
  }
}

function baseStyles(): string {
  return `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
             background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
      .container { max-width: 560px; margin: 40px auto; background: #111; border-radius: 16px;
                   border: 1px solid rgba(255,255,255,0.08); overflow: hidden; }
      .header { padding: 32px 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #fff; }
      .header p { margin: 8px 0 0; font-size: 14px; color: #737373; }
      .body { padding: 32px 40px; }
      .body p { font-size: 15px; line-height: 1.6; color: #a3a3a3; margin: 0 0 16px; }
      .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #06b6d4, #3b82f6);
                color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px;
                margin: 8px 0 24px; }
      .code-box { display: inline-block; padding: 12px 24px; background: rgba(255,255,255,0.05);
                  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
                  font-family: 'SF Mono', monospace; font-size: 24px; letter-spacing: 4px;
                  color: #06b6d4; font-weight: 700; }
      .footer { padding: 24px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); }
      .footer p { font-size: 12px; color: #525252; margin: 0; }
      .footer a { color: #737373; }
    </style>`;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string,
): Promise<EmailResult> {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;
  return send(email, 'Verify your email — FrontendDevHelper', `
    <!DOCTYPE html><html><head>${baseStyles()}</head><body>
    <div class="container">
      <div class="header">
        <h1>Welcome to FrontendDevHelper</h1>
        <p>Verify your email to get started</p>
      </div>
      <div class="body">
        <p>Hey${name ? ` ${name}` : ''},</p>
        <p>Thanks for signing up! Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" class="button">Verify Email</a>
        <p>If the button doesn't work, paste this link into your browser:</p>
        <p style="font-size:13px;word-break:break-all;color:#737373;">${verifyUrl}</p>
      </div>
      <div class="footer">
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>&copy; 2026 FrontendDevHelper</p>
      </div>
    </div>
    </body></html>`);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string,
): Promise<EmailResult> {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
  return send(email, 'Reset your password — FrontendDevHelper', `
    <!DOCTYPE html><html><head>${baseStyles()}</head><body>
    <div class="container">
      <div class="header">
        <h1>Password Reset</h1>
        <p>A reset was requested for your account</p>
      </div>
      <div class="body">
        <p>Hey${name ? ` ${name}` : ''},</p>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>If the button doesn't work, paste this link into your browser:</p>
        <p style="font-size:13px;word-break:break-all;color:#737373;">${resetUrl}</p>
      </div>
      <div class="footer">
        <p>If you didn't request a reset, you can safely ignore this email.</p>
        <p>&copy; 2026 FrontendDevHelper</p>
      </div>
    </div>
    </body></html>`);
}

export async function sendWelcomeEmail(
  email: string,
  name?: string,
): Promise<EmailResult> {
  return send(email, 'Welcome aboard — FrontendDevHelper', `
    <!DOCTYPE html><html><head>${baseStyles()}</head><body>
    <div class="container">
      <div class="header">
        <h1>You're In!</h1>
        <p>Your FrontendDevHelper account is ready</p>
      </div>
      <div class="body">
        <p>Hey${name ? ` ${name}` : ''},</p>
        <p>Your account is set up and ready to go. Here's what you can do next:</p>
        <p><strong style="color:#fff;">Install the extension</strong> — Grab it from the Chrome Web Store and start debugging.</p>
        <p><strong style="color:#fff;">Explore all 39 tools</strong> — CSS debugging, accessibility checks, performance profiling, and more.</p>
        <p><strong style="color:#fff;">Try AI Suggestions</strong> — Connect your OpenRouter API key for intelligent code fixes.</p>
        <p>Need help? Check out the <a href="${BASE_URL}" style="color:#06b6d4;">documentation</a> or open an issue on <a href="https://github.com/rejisterjack/frontend-dev-helper" style="color:#06b6d4;">GitHub</a>.</p>
      </div>
      <div class="footer">
        <p>&copy; 2026 FrontendDevHelper</p>
      </div>
    </div>
    </body></html>`);
}

export async function sendReferralNotificationEmail(
  email: string,
  referralCode: string,
  referredName?: string,
): Promise<EmailResult> {
  return send(email, 'Someone used your referral code! — FrontendDevHelper', `
    <!DOCTYPE html><html><head>${baseStyles()}</head><body>
    <div class="container">
      <div class="header">
        <h1>Referral Reward!</h1>
        <p>Your referral code was just used</p>
      </div>
      <div class="body">
        <p>Great news! Someone${referredName ? ` (${referredName})` : ''} signed up using your referral code.</p>
        <p>Your code: <span class="code-box">${referralCode}</span></p>
        <p>Keep sharing to unlock more rewards. Share your code with colleagues and friends:</p>
        <p style="font-size:15px;font-weight:700;color:#06b6d4;">${referralCode}</p>
      </div>
      <div class="footer">
        <p>&copy; 2026 FrontendDevHelper</p>
      </div>
    </div>
    </body></html>`);
}
