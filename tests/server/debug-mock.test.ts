/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const constructEventMock = vi.fn();

vi.mock('stripe', () => {
  const MockStripe = vi.fn(() => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  }));
  return { default: MockStripe, __esModule: true };
});

describe('mock debug', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stripeInstance: any;

  beforeAll(async () => {
    const Stripe = (await import('stripe')).default;
    stripeInstance = new Stripe('sk_test', { apiVersion: '2023-10-16' } as any);
  });

  beforeEach(() => {
    constructEventMock.mockReset();
  });

  it('test 1 - should return value after reset', () => {
    constructEventMock.mockReturnValue({ type: 'test.event' });
    const result = stripeInstance.webhooks.constructEvent('body', 'sig', 'secret');
    expect(result).toEqual({ type: 'test.event' });
  });

  it('test 2 - should return value after reset', () => {
    constructEventMock.mockReturnValue({ type: 'second.event' });
    const result = stripeInstance.webhooks.constructEvent('body', 'sig', 'secret');
    expect(result).toEqual({ type: 'second.event' });
  });
});
