/**
 * Checkout Routes
 *
 * - POST /session - Create a Stripe checkout session
 * - POST /portal - Create a customer portal session
 * - GET /prices - Get pricing information
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Price IDs from environment
const PRICE_IDS: Record<string, string> = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY!,
  TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY!,
  TEAM_YEARLY: process.env.STRIPE_PRICE_TEAM_YEARLY!,
};

/**
 * POST /v1/checkout/session
 * Create a new checkout session
 */
router.post('/session', async (req, res) => {
  try {
    const { tier, interval, email, successUrl, cancelUrl } = req.body;

    // Validate tier and interval
    const priceKey = `${tier}_${interval}`.toUpperCase();
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      return res.status(400).json({
        error: 'Invalid tier or interval',
        validOptions: Object.keys(PRICE_IDS),
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    // Find or create Stripe customer
    let subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
    });

    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Create subscription record
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: customerId,
          tier: tier.toUpperCase(),
          status: 'INCOMPLETE',
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        userId: user.id,
        tier: tier.toUpperCase(),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: tier.toUpperCase(),
        },
      },
    });

    logger.info(`Checkout session created: ${session.id} for ${email}`);

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /v1/checkout/portal
 * Create a customer portal session
 */
router.post('/portal', async (req, res) => {
  try {
    const { email, returnUrl } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscriptions: true },
    });

    if (!user || user.subscriptions.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const subscription = user.subscriptions[0];

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl || process.env.FRONTEND_URL,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * GET /v1/checkout/prices
 * Get current pricing
 */
router.get('/prices', async (req, res) => {
  try {
    const prices: Record<string, any> = {};

    for (const [key, priceId] of Object.entries(PRICE_IDS)) {
      if (priceId) {
        const price = await stripe.prices.retrieve(priceId);
        const product = await stripe.products.retrieve(price.product as string);

        prices[key] = {
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval,
          product: {
            name: product.name,
            description: product.description,
          },
        };
      }
    }

    res.json({
      prices,
      tiers: {
        FREE: {
          name: 'Free',
          price: 0,
          features: [
            'All core tools',
            '5 Smart Suggestions per day',
            'Basic support',
          ],
        },
        PRO: {
          name: 'Pro',
          monthly: prices.PRO_MONTHLY?.amount || 499,
          yearly: prices.PRO_YEARLY?.amount || 4990,
          features: [
            'All 35+ tools',
            'Unlimited Smart Suggestions',
            'Session Recording',
            'Visual Regression Testing',
            'PDF Export',
            'Priority Support',
          ],
        },
        TEAM: {
          name: 'Team',
          monthly: prices.TEAM_MONTHLY?.amount || 1999,
          yearly: prices.TEAM_YEARLY?.amount || 19990,
          features: [
            'Everything in Pro',
            'Team Collaboration',
            'Shared Baselines',
            'Shared Design Tokens',
            'Admin Panel',
            'SSO Integration',
          ],
        },
      },
    });
  } catch (error) {
    logger.error('Get prices error:', error);
    res.status(500).json({ error: 'Failed to get prices' });
  }
});

/**
 * POST /v1/checkout/upgrade
 * Upgrade/downgrade subscription
 */
router.post('/upgrade', async (req, res) => {
  try {
    const { email, newTier } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscriptions: true },
    });

    if (!user || user.subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active subscription' });
    }

    const subscription = user.subscriptions[0];

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No Stripe subscription found' });
    }

    // Get new price ID
    const priceKey = `${newTier.toUpperCase()}_MONTHLY`;
    const newPriceId = PRICE_IDS[priceKey];

    if (!newPriceId) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Update subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: (await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)).items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      }
    );

    // Update local record
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { tier: newTier.toUpperCase() },
    });

    logger.info(`Subscription upgraded: ${email} to ${newTier}`);

    res.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error) {
    logger.error('Upgrade error:', error);
    res.status(500).json({ error: 'Upgrade failed' });
  }
});

export { router as checkoutRouter };
