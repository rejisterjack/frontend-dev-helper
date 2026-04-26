/**
 * @vitest-environment node
 *
 * Tests for Stripe webhook handlers
 *
 * Strategy: We mock all external dependencies and import the exported
 * handleStripeWebhook function directly, avoiding the need to mock Express.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { randomBytes } from 'crypto';

// ============================================
// Mock external dependencies — use vi.hoisted() for mocks
// referenced inside vi.mock() factories, since vitest hoists
// vi.mock() above all regular const declarations.
// ============================================

const { prismaMock, constructEventMock, sendTransactionalEmailMock } = vi.hoisted(() => {
  const prismaMock = {
    subscription: {
      updateMany: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    license: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };

  const constructEventMock = vi.fn();

  const sendTransactionalEmailMock = vi.fn().mockResolvedValue(undefined);

  return { prismaMock, constructEventMock, sendTransactionalEmailMock };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

vi.mock('stripe', () => {
  const MockStripe = vi.fn(() => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  }));
  return { default: MockStripe, __esModule: true };
});

vi.mock('../../monetization/server/src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../monetization/server/src/utils/notifyUser', () => ({
  sendTransactionalEmail: sendTransactionalEmailMock,
}));

// Set required env vars before the module evaluates
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRequest(overrides: Record<string, any> = {}) {
  return {
    body: overrides.body ?? Buffer.from('{"type":"test"}'),
    headers: {
      'stripe-signature': 't=1234,v1=abc123',
      ...overrides.headers,
    },
  };
}

function buildResponse() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: Record<string, any> = {
    statusCode: 200,
    body: undefined,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      res.body = data;
      return res;
    }),
    send: vi.fn((data: unknown) => {
      res.body = data;
      return res;
    }),
  };
  return res;
}

describe('Stripe Webhooks', () => {
  let postHandler: typeof import('../../monetization/server/src/routes/webhooks').handleStripeWebhook;

  beforeAll(async () => {
    const mod = await import('../../monetization/server/src/routes/webhooks');
    postHandler = mod.handleStripeWebhook;
    expect(postHandler).toBeDefined();
  });

  // Quick sanity test to debug mock identity
  it('should have constructEventMock wired up correctly', async () => {
    const event = { type: 'test.event', data: { object: {} } };
    constructEventMock.mockReturnValue(event);
    // eslint-disable-next-line no-console
    console.log('constructEventMock is mock:', constructEventMock._isMockFunction);
    // eslint-disable-next-line no-console
    console.log('constructEventMock has impl:', constructEventMock.getMockImplementation() !== undefined);

    const req = buildRequest();
    const res = buildResponse();
    await postHandler(req, res);

    expect(constructEventMock).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  // Re-import handler before each test to ensure fresh module state
  // (the global afterEach calls vi.clearAllMocks which can invalidate mock references)
  beforeEach(async () => {
    constructEventMock.mockReset();
    prismaMock.subscription.updateMany.mockReset();
    prismaMock.subscription.update.mockReset();
    prismaMock.subscription.findFirst.mockReset();
    prismaMock.license.findFirst.mockReset();
    prismaMock.license.update.mockReset();
    prismaMock.license.updateMany.mockReset();
    prismaMock.license.create.mockReset();
    prismaMock.user.findUnique.mockReset();
    sendTransactionalEmailMock.mockReset();
    sendTransactionalEmailMock.mockResolvedValue(undefined);
  });

  beforeEach(() => {
    constructEventMock.mockReset();
    prismaMock.subscription.updateMany.mockReset();
    prismaMock.subscription.update.mockReset();
    prismaMock.subscription.findFirst.mockReset();
    prismaMock.license.findFirst.mockReset();
    prismaMock.license.update.mockReset();
    prismaMock.license.updateMany.mockReset();
    prismaMock.license.create.mockReset();
    prismaMock.user.findUnique.mockReset();
    sendTransactionalEmailMock.mockReset();
    sendTransactionalEmailMock.mockResolvedValue(undefined);
  });

  // ============================================
  // Signature Verification
  // ============================================
  describe('Signature Verification', () => {
    it('should reject requests with invalid signature', async () => {
      constructEventMock.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const req = buildRequest();
      const res = buildResponse();

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Webhook Error'));
    });

    it('should accept requests with valid signature', async () => {
      constructEventMock.mockImplementation(() => ({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123', tier: 'PRO' },
            subscription: 'sub_123',
          },
        },
      }));

      prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.license.findFirst.mockResolvedValue(null);
      prismaMock.license.create.mockResolvedValue({ id: 'lic_1' });

      const req = buildRequest();
      const res = buildResponse();

      await postHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // ============================================
  // checkout.session.completed
  // ============================================
  describe('checkout.session.completed', () => {
    it('should create license and update subscription', async () => {
      constructEventMock.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_abc', tier: 'PRO' },
            subscription: 'sub_new',
          },
        },
      });

      prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.license.findFirst.mockResolvedValue(null);
      prismaMock.license.create.mockResolvedValue({ id: 'lic_new' });

      const req = buildRequest();
      const res = buildResponse();

      await postHandler(req, res);

      expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_abc' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );

      expect(prismaMock.license.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user_abc',
            tier: 'PRO',
            status: 'ACTIVE',
          }),
        }),
      );

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should update existing license instead of creating new one', async () => {
      constructEventMock.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_existing', tier: 'TEAM' },
            subscription: 'sub_existing',
          },
        },
      });

      prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.license.findFirst.mockResolvedValue({ id: 'lic_old' });
      prismaMock.license.update.mockResolvedValue({ id: 'lic_old' });

      const req = buildRequest();
      const res = buildResponse();

      await postHandler(req, res);

      expect(prismaMock.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lic_old' },
          data: expect.objectContaining({ tier: 'TEAM', status: 'ACTIVE' }),
        }),
      );
      expect(prismaMock.license.create).not.toHaveBeenCalled();
    });

    it('should reject missing metadata', async () => {
      constructEventMock.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: null,
            subscription: 'sub_no_meta',
          },
        },
      });

      const req = buildRequest();
      const res = buildResponse();

      await postHandler(req, res);

      expect(prismaMock.license.create).not.toHaveBeenCalled();
      expect(prismaMock.license.update).not.toHaveBeenCalled();
    });

    it('should reject invalid tier value', async () => {
      constructEventMock.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_bad', tier: 'ENTERPRISE' },
            subscription: 'sub_bad',
          },
        },
      });

      const req = buildRequest();
      const res = buildResponse();

      await postHandler(req, res);

      expect(prismaMock.license.create).not.toHaveBeenCalled();
      expect(prismaMock.license.update).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // invoice.payment_succeeded
  // ============================================
  describe('invoice.payment_succeeded', () => {
    it('should update subscription period and license expiration', async () => {
      constructEventMock.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_renew',
            period_start: 1700000000,
            period_end: 1702000000,
          },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_renew',
        userId: 'user_renew',
        stripeSubscriptionId: 'sub_renew',
      });
      prismaMock.subscription.update.mockResolvedValue({ id: 'db_sub_renew' });
      prismaMock.license.updateMany.mockResolvedValue({ count: 1 });

      await postHandler(buildRequest(), buildResponse());

      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'db_sub_renew' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );

      expect(prismaMock.license.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_renew' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should handle missing subscription gracefully', async () => {
      constructEventMock.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: { subscription: 'sub_missing' },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue(null);

      const res = buildResponse();
      await postHandler(buildRequest(), res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // invoice.payment_failed
  // ============================================
  describe('invoice.payment_failed', () => {
    it('should mark subscription as PAST_DUE', async () => {
      constructEventMock.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: { subscription: 'sub_fail' },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_1',
        userId: 'user_fail',
        stripeSubscriptionId: 'sub_fail',
      });
      prismaMock.subscription.update.mockResolvedValue({ id: 'db_sub_1', status: 'PAST_DUE' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user_fail', email: 'fail@example.com' });

      await postHandler(buildRequest(), buildResponse());

      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'db_sub_1' },
          data: { status: 'PAST_DUE' },
        }),
      );
    });

    it('should send payment failed email', async () => {
      constructEventMock.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: { subscription: 'sub_fail_email' },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_email',
        userId: 'user_email',
        stripeSubscriptionId: 'sub_fail_email',
      });
      prismaMock.subscription.update.mockResolvedValue({ id: 'db_sub_email' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_email',
        email: 'test@example.com',
      });

      await postHandler(buildRequest(), buildResponse());

      expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('payment issue'),
          kind: 'payment_failed',
        }),
      );
    });

    it('should handle missing subscription gracefully', async () => {
      constructEventMock.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: { subscription: 'sub_missing' },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue(null);

      const res = buildResponse();
      await postHandler(buildRequest(), res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    });

    it('should still respond ok when user has no email', async () => {
      constructEventMock.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: { subscription: 'sub_no_email' },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_noemail',
        userId: 'user_noemail',
        stripeSubscriptionId: 'sub_no_email',
      });
      prismaMock.subscription.update.mockResolvedValue({ id: 'db_sub_noemail' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user_noemail', email: null });

      const res = buildResponse();
      await postHandler(buildRequest(), res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // customer.subscription.updated
  // ============================================
  describe('customer.subscription.updated', () => {
    it('should update subscription status in database', async () => {
      constructEventMock.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_update',
            status: 'active',
            current_period_start: 1700000000,
            current_period_end: 1702000000,
            canceled_at: null,
          },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_upd',
        userId: 'user_upd',
        stripeSubscriptionId: 'sub_update',
      });
      prismaMock.subscription.update.mockResolvedValue({ id: 'db_sub_upd' });

      await postHandler(buildRequest(), buildResponse());

      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'db_sub_upd' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  // ============================================
  // customer.subscription.deleted
  // ============================================
  describe('customer.subscription.deleted', () => {
    it('should downgrade license to FREE', async () => {
      constructEventMock.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_delete' } },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_del',
        userId: 'user_del',
        stripeSubscriptionId: 'sub_delete',
      });
      prismaMock.subscription.update.mockResolvedValue({ id: 'db_sub_del', status: 'CANCELED' });
      prismaMock.license.updateMany.mockResolvedValue({ count: 1 });

      await postHandler(buildRequest(), buildResponse());

      expect(prismaMock.license.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_del' },
          data: { tier: 'FREE', status: 'ACTIVE' },
        }),
      );
    });

    it('should mark subscription as CANCELED', async () => {
      constructEventMock.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_cancel' } },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_cancel',
        userId: 'user_cancel',
        stripeSubscriptionId: 'sub_cancel',
      });
      prismaMock.subscription.update.mockResolvedValue({ id: 'db_sub_cancel', status: 'CANCELED' });
      prismaMock.license.updateMany.mockResolvedValue({ count: 1 });

      await postHandler(buildRequest(), buildResponse());

      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'db_sub_cancel' },
          data: { status: 'CANCELED' },
        }),
      );
    });

    it('should handle missing subscription gracefully', async () => {
      constructEventMock.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_gone' } },
      });

      prismaMock.subscription.findFirst.mockResolvedValue(null);

      const res = buildResponse();
      await postHandler(buildRequest(), res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // customer.subscription.trial_will_end
  // ============================================
  describe('customer.subscription.trial_will_end', () => {
    it('should send trial ending email to user', async () => {
      constructEventMock.mockReturnValue({
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: 'sub_trial',
            trial_end: 1703000000,
          },
        },
      });

      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'db_sub_trial',
        userId: 'user_trial',
        stripeSubscriptionId: 'sub_trial',
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_trial',
        email: 'trial@example.com',
      });

      await postHandler(buildRequest(), buildResponse());

      expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'trial@example.com',
          subject: expect.stringContaining('trial'),
          kind: 'trial_ending',
        }),
      );
    });
  });

  // ============================================
  // License Key Generation
  // ============================================
  describe('License Key Generation', () => {
    it('should generate keys in FDH-XXXX-XXXX-XXXX format', async () => {
      constructEventMock.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_keygen', tier: 'PRO' },
            subscription: 'sub_keygen',
          },
        },
      });

      prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.license.findFirst.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.license.create.mockImplementation((args: Record<string, any>) =>
        Promise.resolve({ id: 'lic_new', ...args.data }),
      );

      await postHandler(buildRequest(), buildResponse());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createCall = prismaMock.license.create.mock.calls[0][0] as { data: { key: string } };
      const generatedKey = createCall.data.key;

      expect(generatedKey).toMatch(/^FDH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate unique keys on each call', async () => {
      const keys = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const segments = Array.from({ length: 3 }, () =>
          randomBytes(2).toString('hex').toUpperCase(),
        );
        keys.add(`FDH-${segments.join('-')}`);
      }
      expect(keys.size).toBe(50);
    });

    it('should use cryptographic randomness (not Math.random)', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const segments = Array.from({ length: 3 }, () =>
          randomBytes(2).toString('hex').toUpperCase(),
        );
        keys.add(`FDH-${segments.join('-')}`);
      }
      expect(keys.size).toBe(100);
    });
  });

  // ============================================
  // Unhandled event types
  // ============================================
  describe('Unhandled event types', () => {
    it('should respond with received:true for unknown event types', async () => {
      constructEventMock.mockReturnValue({
        type: 'account.updated',
        data: { object: {} },
      });

      const res = buildResponse();
      await postHandler(buildRequest(), res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // ============================================
  // Error handling
  // ============================================
  describe('Error handling', () => {
    it('should return 500 when handler throws', async () => {
      constructEventMock.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_err', tier: 'PRO' },
            subscription: 'sub_err',
          },
        },
      });

      prismaMock.subscription.updateMany.mockRejectedValue(new Error('DB connection lost'));

      const res = buildResponse();
      await postHandler(buildRequest(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook handler failed' });
    });
  });
});
