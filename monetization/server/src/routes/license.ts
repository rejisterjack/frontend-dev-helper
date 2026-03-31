/**
 * License Routes
 *
 * - POST /validate - Validate a license key
 * - POST /activate - Activate a license for a user
 * - POST /deactivate - Deactivate a license
 * - GET /:userId - Get all licenses for a user
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Validation schema
const validateLicenseSchema = z.object({
  licenseKey: z.string().regex(/^FDH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  extensionId: z.string(),
  version: z.string(),
});

// Generate license key
function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 3; i++) {
    segments.push(Math.random().toString(36).substring(2, 6).toUpperCase());
  }
  return `FDH-${segments.join('-')}`;
}

/**
 * POST /v1/license/validate
 * Validate a license key and return a JWT token
 */
router.post('/validate', async (req, res) => {
  try {
    const { licenseKey, extensionId, version } = validateLicenseSchema.parse(req.body);

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
      include: { user: true },
    });

    if (!license) {
      return res.status(404).json({
        valid: false,
        error: 'License not found',
      });
    }

    // Check if expired
    if (license.expiresAt && license.expiresAt < new Date()) {
      await prisma.license.update({
        where: { id: license.id },
        data: { status: 'EXPIRED' },
      });

      return res.status(403).json({
        valid: false,
        error: 'License expired',
        tier: license.tier,
      });
    }

    // Check status
    if (license.status !== 'ACTIVE') {
      return res.status(403).json({
        valid: false,
        error: `License ${license.status.toLowerCase()}`,
      });
    }

    // Update validation stats
    await prisma.license.update({
      where: { id: license.id },
      data: {
        lastValidated: new Date(),
        validationCount: { increment: 1 },
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        licenseId: license.id,
        userId: license.userId,
        tier: license.tier,
        extensionId,
        version,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    logger.info(`License validated: ${licenseKey} for ${license.user.email}`);

    res.json({
      valid: true,
      token,
      tier: license.tier,
      expiresAt: license.expiresAt,
      features: getFeaturesForTier(license.tier),
    });
  } catch (error) {
    logger.error('License validation error:', error);
    res.status(400).json({
      valid: false,
      error: 'Invalid request',
    });
  }
});

/**
 * POST /v1/license/activate
 * Activate a license (associate with user)
 */
router.post('/activate', async (req, res) => {
  try {
    const { licenseKey, email } = req.body;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    // Find license
    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.userId && license.userId !== user.id) {
      return res.status(403).json({ error: 'License already activated' });
    }

    // Activate license
    const updatedLicense = await prisma.license.update({
      where: { id: license.id },
      data: { userId: user.id, status: 'ACTIVE' },
    });

    logger.info(`License activated: ${licenseKey} for ${email}`);

    res.json({
      success: true,
      license: updatedLicense,
    });
  } catch (error) {
    logger.error('License activation error:', error);
    res.status(500).json({ error: 'Activation failed' });
  }
});

/**
 * GET /v1/license/:userId
 * Get all licenses for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const licenses = await prisma.license.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ licenses });
  } catch (error) {
    logger.error('Get licenses error:', error);
    res.status(500).json({ error: 'Failed to get licenses' });
  }
});

/**
 * POST /v1/license/generate
 * Generate a new license (admin only)
 */
router.post('/generate', async (req, res) => {
  try {
    const { tier, expiresAt, count = 1 } = req.body;

    // In production, check admin API key here
    const apiKey = req.headers['x-admin-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const licenses = [];
    for (let i = 0; i < count; i++) {
      const license = await prisma.license.create({
        data: {
          key: generateLicenseKey(),
          tier: tier || 'PRO',
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
      licenses.push(license);
    }

    res.json({
      success: true,
      licenses,
    });
  } catch (error) {
    logger.error('License generation error:', error);
    res.status(500).json({ error: 'Generation failed' });
  }
});

// Helper function
function getFeaturesForTier(tier: string): string[] {
  const features: Record<string, string[]> = {
    FREE: [
      'dom_outliner',
      'color_picker',
      'css_inspector',
      'spacing_visualizer',
      'smart_suggestions_limited',
    ],
    PRO: [
      'all_tools',
      'unlimited_smart_suggestions',
      'session_recording',
      'visual_regression',
      'pdf_export',
      'priority_support',
    ],
    TEAM: [
      'all_pro_features',
      'team_collaboration',
      'shared_baselines',
      'shared_design_tokens',
      'admin_panel',
      'sso',
    ],
  };

  return features[tier] || features.FREE;
}

export { router as licenseRouter };
