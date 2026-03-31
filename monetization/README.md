# Monetization Infrastructure

This directory contains the monetization infrastructure for FrontendDevHelper.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Extension     │────▶│  License Server │────▶│     Stripe      │
│   (Client)      │◄────│   (Node.js)     │◄────│   (Payments)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         └───────────────────────────────────────────────┘
                            Webhooks
```

## Components

### 1. License Server (`server/`)
- Node.js/Express API
- JWT-based license validation
- Stripe webhook handling
- Team management endpoints

### 2. Stripe Integration
- Checkout sessions
- Subscription management
- Webhook events
- Customer portal

### 3. Extension Client
- License key storage
- Periodic validation
- Grace period handling
- Feature gating

## Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Core tools, 5 AI analyses/day |
| Pro | $4.99/mo | Unlimited AI, priority support, session sharing |
| Team | $19.99/mo | Everything + team collaboration, admin panel, SSO |

## API Endpoints

### License Validation
```
POST /v1/license/validate
{
  "licenseKey": "FDH-PRO-XXXX-XXXX",
  "extensionId": "...",
  "version": "1.0.0"
}
```

### Checkout
```
POST /v1/checkout/session
{
  "tier": "pro|team",
  "email": "user@example.com",
  "successUrl": "...",
  "cancelUrl": "..."
}
```

### Webhooks
```
POST /v1/webhooks/stripe
```

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...

# Extension
EXTENSION_ID=...
```

## Deployment

### License Server
```bash
cd server
npm install
npm run build
npm start
```

### Docker
```bash
docker build -t fdh-license-server .
docker run -p 3000:3000 --env-file .env fdh-license-server
```

## Security

- All API requests over HTTPS
- JWT tokens with 24h expiry
- Rate limiting: 100 req/min per IP
- Stripe signature verification
- License key format validation

## Monitoring

- Health endpoint: GET /health
- Metrics: Prometheus + Grafana
- Alerts: PagerDuty integration
- Logs: Winston + CloudWatch
