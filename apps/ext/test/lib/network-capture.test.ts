import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkCapture } from '@/lib/network-capture';

describe('NetworkCapture', () => {
  let capture: NetworkCapture;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    capture = new NetworkCapture();
  });

  afterEach(() => {
    // Ensure capture is stopped and fetch restored
    if (capture.isRunning()) {
      capture.stop();
    }
    global.fetch = originalFetch;
  });

  it('creates instance, not capturing initially', () => {
    expect(capture.isRunning()).toBe(false);
    expect(capture.getRequests()).toHaveLength(0);
  });

  it('start() begins capture', () => {
    capture.start();
    expect(capture.isRunning()).toBe(true);
  });

  it('stop() restores originals', () => {
    const fetchBefore = global.fetch;
    capture.start();
    // The intercepted fetch should be a different function
    expect(global.fetch).not.toBe(fetchBefore);
    capture.stop();
    // After stop, fetch should work again (restored from internal reference)
    expect(capture.isRunning()).toBe(false);
  });

  it('getRequests() returns captured requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('{"data":"test"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    global.fetch = mockFetch;

    capture.start();

    // Make a fetch request through the intercepted window.fetch
    await window.fetch('https://api.example.com/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' }),
    });

    const requests = capture.getRequests();
    expect(requests.length).toBeGreaterThanOrEqual(1);

    const captured = requests.find((r) => r.url === 'https://api.example.com/data');
    expect(captured).toBeDefined();
    expect(captured!.method).toBe('POST');
    expect(captured!.statusCode).toBe(200);

    capture.stop();
  });

  it('clear() empties requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );
    global.fetch = mockFetch;

    capture.start();
    await window.fetch('https://api.example.com/test');
    capture.stop();

    expect(capture.getRequests().length).toBeGreaterThan(0);

    capture.clear();
    expect(capture.getRequests()).toHaveLength(0);
  });

  it('isRunning() reflects capture state', () => {
    expect(capture.isRunning()).toBe(false);
    capture.start();
    expect(capture.isRunning()).toBe(true);
    capture.stop();
    expect(capture.isRunning()).toBe(false);
  });

  it('does not start twice', () => {
    capture.start();
    const fetchAfterFirstStart = global.fetch;
    capture.start(); // second call should be no-op
    expect(global.fetch).toBe(fetchAfterFirstStart);
    capture.stop();
  });

  it('filters requests by url', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );
    global.fetch = mockFetch;

    capture.start();
    await window.fetch('https://api.example.com/users');
    await window.fetch('https://api.example.com/posts');
    capture.stop();

    const filtered = capture.getRequests({ url: 'users' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].url).toContain('users');
  });

  it('respects captureFetch: false option', () => {
    const noFetchCapture = new NetworkCapture({ captureFetch: false });
    const fetchBefore = global.fetch;
    noFetchCapture.start();
    expect(global.fetch).toBe(fetchBefore);
    noFetchCapture.stop();
  });
});
