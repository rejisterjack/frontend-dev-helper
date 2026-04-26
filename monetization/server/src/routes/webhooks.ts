/**
 * Stripe Webhook Routes
 *
 * - POST /stripe - Handle Stripe webhook events
 */

import { Router, raw } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { sendTransactionalEmail } from '../utils/notifyUser';

const router = Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Use raw body for webhook signature verification
router.use('/stripe', raw({ type: 'application/json' }));

/**
 * POST /v1/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
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
  }
});

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;

  if (!userId || !tier) {
    logger.error('Missing metadata in checkout session');
    return;
  }

  // Update subscription record
  await prisma.subscription.updateMany({
    where: { userId },
    data: {
      stripeSubscriptionId: session.subscription as string,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Create or update license
  const existingLicense = await prisma.license.findFirst({
    where: { userId },
  });

  if (existingLicense) {
    await prisma.license.update({
      where: { id: existingLicense.id },
      data: {
        tier: tier as any,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  } else {
    await prisma.license.create({
      data: {
        userId,
        key: generateLicenseKey(),
        tier: tier as any,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  logger.info(`Checkout completed for user ${userId}, tier ${tier}`);
}

/**
 * Handle invoice.payment_succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) {
    logger.error(`Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update subscription period
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(invoice.period_start * 1000),
      currentPeriodEnd: new Date(invoice.period_end * 1000),
    },
  });

  // Update license expiration
  await prisma.license.updateMany({
    where: { userId: subscription.userId },
    data: {
      status: 'ACTIVE',
      expiresAt: new Date(invoice.period_end * 1000),
    },
  });

  logger.info(`Payment succeeded for subscription ${subscriptionId}`);
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) {
    logger.error(`Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE' },
  });

  const user = await prisma.user.findUnique({
    where: { id: subscription.userId },
  });
  if (user?.email) {
    try {
      await sendTransactionalEmail({
        to: user.email,
        subject: 'FrontendDevHelper: payment issue with your subscription',
        text: `We could not process a payment for your subscription (Stripe subscription ${subscriptionId}).\n\nPlease update your payment method in the customer portal to avoid interruption.\n\nIf you already fixed this, you can ignore this message.`,
        kind: 'payment_failed',
      });
    } catch (e) {
      logger.error('Failed to send payment-failed email:', e);
    }
  }

  logger.warn(`Payment failed for subscription ${subscriptionId}`);
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    logger.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  const status = subscription.status.toUpperCase() as any;

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

  logger.info(`Subscription updated: ${subscription.id}, status: ${status}`);
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    logger.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  // Mark subscription as canceled
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: 'CANCELED' },
  });

  // Downgrade license to FREE
  await prisma.license.updateMany({
    where: { userId: dbSubscription.userId },
    data: {
      tier: 'FREE',
      status: 'ACTIVE',
    },
  });

  logger.info(`Subscription canceled: ${subscription.id}`);
}

/**
 * Handle customer.subscription.trial_will_end
 */
async function handleTrialEnding(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    logger.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: dbSubscription.userId },
  });
  if (user?.email) {
    try {
      const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : 'soon';
      await sendTransactionalEmail({
        to: user.email,
        subject: 'FrontendDevHelper: your trial is ending soon',
        text: `Your FrontendDevHelper trial is ending (trial end: ${trialEnd}).\n\nAdd a payment method to keep Pro or Team features without interruption.\n\nSubscription id: ${subscription.id}`,
        kind: 'trial_ending',
      });
    } catch (e) {
      logger.error('Failed to send trial-ending email:', e);
    }
  }

  logger.info(`Trial ending soon for subscription: ${subscription.id}`);
}

// Helper function
function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 3; i++) {
    segments.push(Math.random().toString(36).substring(2, 6).toUpperCase());
  }
  return `FDH-${segments.join('-')}`;
}

export { router as webhookRouter };
