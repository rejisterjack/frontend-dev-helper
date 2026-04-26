/**
 * Transactional email for license-server events.
 * When RESEND_API_KEY is set, sends via Resend's HTTP API.
 * Otherwise logs the payload (suitable for dev / bring-your-own-mail later).
 */

import { logger } from './logger';

export type NotifyPayload = {
  to: string;
  subject: string;
  text: string;
  /** Optional tag for log correlation */
  kind?: 'payment_failed' | 'trial_ending';
};

/**
 * Resend: https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendTransactionalEmail(payload: NotifyPayload): Promise<void> {
  const { to, subject, text, kind } = payload;
  const from = process.env.RESEND_FROM;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !from) {
    logger.info(
      `Transactional email (${kind || 'generic'}) [not sent — set RESEND_API_KEY and RESEND_FROM]: to=${to} subject=${subject}`
    );
    logger.debug(`Body:\n${text}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${errBody}`);
  }

  logger.info(`Transactional email sent (${kind || 'generic'}) to ${to}`);
}
