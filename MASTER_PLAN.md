# Master Plan — whole monorepo

Launch bar: **free OSS** (no Stripe, licenses, or teams). Referrals are a web-only account growth feature. `apps/mcp` is optional/vendored.

## Status

| Surface | Plan | Notes |
| ------- | ---- | ----- |
| Extension | [`MASTER_PLAN_EXT.md`](./MASTER_PLAN_EXT.md) | Phase 0–2 done (launch remediation) |
| Whole product | This file | Launch-complete remediation Phases 0–8 **done** |

## Launch-complete remediation

Phases 0–8 implemented:

0. Product truth and legal (LICENSE, docs) — done
1. Web auth and security (SessionProvider, CSP, Upstash, register UX) — done
2. Free-OSS alignment (remove monetization scaffolding) — done
3. Referral program E2E (web only) — done
4. VS Code bridge loopback + PR CI — done
5. Extension profiler, permissions, e2e, bundle, eslint — done
6. MCP root CI + docs — done
7. Zod 4 on web, Auth.js (`5.0.0-beta.32`), remove `@repo/ui` — done
8. Full monorepo verification — done

## Definition of launch-complete

- Critical/High audit findings closed
- Journeys: tool use, bridge, signup→dashboard, AI assist functional
- License/billing claims removed; referrals work on web E2E
- PR CI covers web, ext, vsx, mcp, security
- Marketing, README, LICENSE, privacy docs consistent with free OSS
