import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Route-level tests for referral APIs.
 * Run with: bunx vitest run (from apps/web when vitest is configured)
 * or bundled into web unit test script.
 */

const mockAuth = vi.fn();
const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    referral: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/crypto", () => ({
  randomCode: () => "ABCDEFGH",
}));

describe("GET /api/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("../app/api/referrals/route");
    const res = await GET(new Request("http://localhost/api/referrals"));
    expect(res.status).toBe(401);
  });

  it("returns referrals for the authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockFindMany.mockResolvedValue([
      {
        id: "r1",
        referralCode: "FDH-ABCDEFGH",
        status: "PENDING",
        reward: null,
        redeemedAt: null,
        createdAt: new Date("2026-01-01"),
        referredId: null,
      },
    ]);
    const { GET } = await import("../app/api/referrals/route");
    const res = await GET(new Request("http://localhost/api/referrals"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.referrals).toHaveLength(1);
    expect(body.referrals[0].referralCode).toBe("FDH-ABCDEFGH");
    expect(body.referrals[0].referred).toBeNull();
  });
});

describe("POST /api/referrals/code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing code without creating another", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockFindFirst.mockResolvedValue({ referralCode: "FDH-EXISTING" });
    const { POST } = await import("../app/api/referrals/code/route");
    const res = await POST(new Request("http://localhost/api/referrals/code"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.referralCode).toBe("FDH-EXISTING");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a new code when none exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockFindFirst.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ referralCode: "FDH-ABCDEFGH" });
    const { POST } = await import("../app/api/referrals/code/route");
    const res = await POST(new Request("http://localhost/api/referrals/code"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.referralCode).toBe("FDH-ABCDEFGH");
  });
});
