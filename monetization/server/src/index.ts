/**
 * FrontendDevHelper License Server
 *
 * Validates licenses, handles Stripe webhooks, manages team subscriptions
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { licenseRouter } from './routes/license';
import { checkoutRouter } from './routes/checkout';
import { webhookRouter } from './routes/webhooks';
import { teamRouter } from './routes/team';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['chrome-extension://*'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/v1/license', licenseRouter);
app.use('/v1/checkout', checkoutRouter);
app.use('/v1/webhooks', webhookRouter);
app.use('/v1/team', teamRouter);
app.use('/health', healthRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  logger.info(`License server running on port ${PORT}`);
});

export default app;
