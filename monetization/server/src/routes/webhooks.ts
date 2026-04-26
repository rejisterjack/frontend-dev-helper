/**
 * Stripe Webhook Routes
 *
 * - POST /stripe - Handle Stripe webhook events
 */

import { Router, raw } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger';
import { sendTransactionalEmail } from '../utils/notifyUser';

// ---------- Zod validation schemas ----------

const checkoutMetadataSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  tier: z.enum(['PRO', 'TEAM'], { required_error: 'tier must be PRO or TEAM' }),
});

const invoiceSubscriptionSchema = z.object({
  subscription: z.string({ required_error: 'invoice.subscription is required' }),
});

const subscriptionIdSchema = z.object({
  id: z.string().min(1, 'subscription.id is required'),
});

const router = Router();
const prisma = new PrismaClient();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY environment variable is required');
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Use raw body for webhook signature verification
router.use('/stripe', raw({ type: 'application/json' }));

/**
 * POST /v1/webhooks/stripe
 * Handle Stripe webhook events
 */
function createWebhookHandler(stripeClient: Stripe) {
  return async function handleStripeWebhook(req: { body: Buffer | string; headers: Record<string, string> }, res: {
    status: (code: number) => { json: (data: unknown) => void; send: (data: string) => void };
    json: (data: unknown) => void;
    send: (data: string) => void;
  }) {
  const sig = req.headers['stripe-signature'] as string;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');

  let event: Stripe.Event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Webhook signature verification failed: ${message}`);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  logger.info(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialEnding(subscription);
        break;
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  } finally {
    logger.info(`Webhook processing completed: ${event.type}`);
  }
  };
}

const handleStripeWebhook = createWebhookHandler(stripe);

router.post('/stripe', handleStripeWebhook);

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const parsed = checkoutMetadataSchema.safeParse(session.metadata);
  if (!parsed.success) {
    logger.error(`Invalid checkout session metadata: ${parsed.error.message}`);
    return;
  }
  const { userId, tier } = parsed.data;

  // Update subscription record
  try {
    await prisma.subscription.updateMany({
      where: { userId },
      data: {
        stripeSubscriptionId: session.subscription as string,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  } catch (dbError) {
    logger.error('Database error updating subscription on checkout:', dbError);
  }

  // Create or update license
  try {
    const existingLicense = await prisma.license.findFirst({
      where: { userId },
    });

    if (existingLicense) {
      await prisma.license.update({
        where: { id: existingLicense.id },
        data: {
          tier: tier as 'PRO' | 'TEAM',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      await prisma.license.create({
        data: {
          userId,
          key: generateLicenseKey(),
          tier: tier as 'PRO' | 'TEAM',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  } catch (dbError) {
    logger.error('Database error upserting license on checkout:', dbError);
  }

  logger.info(`Checkout completed for user ${userId}, tier ${tier}`);
}

/**
 * Handle invoice.payment_succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const parsed = invoiceSubscriptionSchema.safeParse({ subscription: invoice.subscription });
  if (!parsed.success) {
    logger.error(`Invalid invoice.subscription: ${parsed.error.message}`);
    return;
  }
  const subscriptionId = parsed.data.subscription;

  let subscription;
  try {
    subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
  } catch (dbError) {
    logger.error('Database error looking up subscription for invoice:', dbError);
    return;
  }

  if (!subscription) {
    logger.error(`Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update subscription period
  try {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
      },
    });
  } catch (dbError) {
    logger.error('Database error updating subscription period:', dbError);
  }

  // Update license expiration
  try {
    await prisma.license.updateMany({
      where: { userId: subscription.userId },
      data: {
        status: 'ACTIVE',
        expiresAt: new Date(invoice.period_end * 1000),
      },
    });
  } catch (dbError) {
    logger.error('Database error updating license expiration:', dbError);
  }

  logger.info(`Payment succeeded for subscription ${subscriptionId}`);
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const parsed = invoiceSubscriptionSchema.safeParse({ subscription: invoice.subscription });
  if (!parsed.success) {
    logger.error(`Invalid invoice.subscription: ${parsed.error.message}`);
    return;
  }
  const subscriptionId = parsed.data.subscription;

  let subscription;
  try {
    subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
  } catch (dbError) {
    logger.error('Database error looking up subscription for failed invoice:', dbError);
    return;
  }

  if (!subscription) {
    logger.error(`Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update subscription status
  try {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    });
  } catch (dbError) {
    logger.error('Database error updating subscription to PAST_DUE:', dbError);
  }

  // Notify user
  try {
    const user = await prisma.user.findUnique({
      where: { id: subscription.userId },
    });
    if (user?.email) {
      await sendTransactionalEmail({
        to: user.email,
        subject: 'FrontendDevHelper: payment issue with your subscription',
        text: `We could not process a payment for your subscription (Stripe subscription ${subscriptionId}).\n\nPlease update your payment method in the customer portal to avoid interruption.\n\nIf you already fixed this, you can ignore this message.`,
        kind: 'payment_failed',
      });
    }
  } catch (e) {
    logger.error('Failed to send payment-failed email:', e);
  }

  logger.warn(`Payment failed for subscription ${subscriptionId}`);
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const parsed = subscriptionIdSchema.safeParse({ id: subscription.id });
  if (!parsed.success) {
    logger.error(`Invalid subscription.id: ${parsed.error.message}`);
    return;
  }

  let dbSubscription;
  try {
    dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
  } catch (dbError) {
    logger.error('Database error looking up subscription for update:', dbError);
    return;
  }

  if (!dbSubscription) {
    logger.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  const status = subscription.status.toUpperCase() as any;

  try {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    });
  } catch (dbError) {
    logger.error('Database error updating subscription:', dbError);
  }

  logger.info(`Subscription updated: ${subscription.id}, status: ${status}`);
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const parsed = subscriptionIdSchema.safeParse({ id: subscription.id });
  if (!parsed.success) {
    logger.error(`Invalid subscription.id: ${parsed.error.message}`);
    return;
  }

  let dbSubscription;
  try {
    dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
  } catch (dbError) {
    logger.error('Database error looking up subscription for deletion:', dbError);
    return;
  }

  if (!dbSubscription) {
    logger.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  // Mark subscription as canceled
  try {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status: 'CANCELED' },
    });
  } catch (dbError) {
    logger.error('Database error canceling subscription:', dbError);
  }

  // Downgrade license to FREE
  try {
    await prisma.license.updateMany({
      where: { userId: dbSubscription.userId },
      data: {
        tier: 'FREE',
        status: 'ACTIVE',
      },
    });
  } catch (dbError) {
    logger.error('Database error downgrading license:', dbError);
  }

  logger.info(`Subscription canceled: ${subscription.id}`);
}

/**
 * Handle customer.subscription.trial_will_end
 */
async function handleTrialEnding(subscription: Stripe.Subscription) {
  const parsed = subscriptionIdSchema.safeParse({ id: subscription.id });
  if (!parsed.success) {
    logger.error(`Invalid subscription.id: ${parsed.error.message}`);
    return;
  }

  let dbSubscription;
  try {
    dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
  } catch (dbError) {
    logger.error('Database error looking up subscription for trial ending:', dbError);
    return;
  }

  if (!dbSubscription) {
    logger.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  // Notify user
  try {
    const user = await prisma.user.findUnique({
      where: { id: dbSubscription.userId },
    });
    if (user?.email) {
      const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : 'soon';
      await sendTransactionalEmail({
        to: user.email,
        subject: 'FrontendDevHelper: your trial is ending soon',
        text: `Your FrontendDevHelper trial is ending (trial end: ${trialEnd}).\n\nAdd a payment method to keep Pro or Team features without interruption.\n\nSubscription id: ${subscription.id}`,
        kind: 'trial_ending',
      });
    }
  } catch (e) {
    logger.error('Failed to send trial-ending email:', e);
  }

  logger.info(`Trial ending soon for subscription: ${subscription.id}`);
}

// Helper function
function generateLicenseKey(): string {
  const segments = Array.from({ length: 3 }, () =>
    randomBytes(2).toString('hex').toUpperCase()
  );
  return `FDH-${segments.join('-')}`;
}

export { router as webhookRouter, handleStripeWebhook, createWebhookHandler };
