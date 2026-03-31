/**
 * Team Routes
 *
 * - POST /create - Create a new team
 * - POST /:teamId/invite - Invite a member to a team
 * - POST /:teamId/remove - Remove a member from a team
 * - GET /:teamId - Get team details
 * - GET /:teamId/members - Get team members
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  ownerEmail: z.string().email(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

/**
 * POST /v1/team/create
 * Create a new team
 */
router.post('/create', async (req, res) => {
  try {
    const { name, ownerEmail } = createTeamSchema.parse(req.body);

    // Find owner user
    let owner = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    if (!owner) {
      owner = await prisma.user.create({
        data: { email: ownerEmail },
      });
    }

    // Check if owner has TEAM license
    const license = await prisma.license.findFirst({
      where: {
        userId: owner.id,
        tier: 'TEAM',
        status: 'ACTIVE',
      },
    });

    if (!license) {
      return res.status(403).json({
        error: 'Team license required',
        message: 'You need an active TEAM subscription to create a team',
      });
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        ownerId: owner.id,
        maxMembers: 5, // Default for TEAM tier
      },
      include: {
        owner: true,
        members: {
          include: { user: true },
        },
      },
    });

    // Add owner as team member
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: owner.id,
        role: 'OWNER',
      },
    });

    logger.info(`Team created: ${team.name} by ${ownerEmail}`);

    res.json({
      success: true,
      team,
    });
  } catch (error) {
    logger.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * POST /v1/team/:teamId/invite
 * Invite a member to a team
 */
router.post('/:teamId/invite', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, role } = inviteSchema.parse(req.body);

    // Check team exists and has space
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({
        error: 'Team is full',
        message: `Maximum ${team.maxMembers} members allowed`,
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a team member' });
    }

    // Add member
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
        role,
      },
      include: { user: true },
    });

    // Grant TEAM license to member
    await prisma.license.create({
      data: {
        userId: user.id,
        key: generateLicenseKey(),
        tier: 'TEAM',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    logger.info(`Member invited: ${email} to team ${teamId}`);

    res.json({
      success: true,
      member,
    });
  } catch (error) {
    logger.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

/**
 * POST /v1/team/:teamId/remove
 * Remove a member from a team
 */
router.post('/:teamId/remove', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove team member
    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });

    // Downgrade license to FREE
    await prisma.license.updateMany({
      where: { userId: user.id },
      data: {
        tier: 'FREE',
        status: 'ACTIVE',
      },
    });

    logger.info(`Member removed: ${email} from team ${teamId}`);

    res.json({ success: true });
  } catch (error) {
    logger.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

/**
 * GET /v1/team/:teamId
 * Get team details
 */
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: true,
        members: {
          include: { user: true },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team });
  } catch (error) {
    logger.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to get team' });
  }
});

/**
 * GET /v1/team/user/:email
 * Get teams for a user
 */
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teams: {
          include: {
            team: {
              include: {
                owner: true,
                members: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      teams: user.teams.map((tm) => tm.team),
    });
  } catch (error) {
    logger.error('Get user teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

/**
 * POST /v1/team/:teamId/design-tokens
 * Save team design tokens
 */
router.post('/:teamId/design-tokens', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { tokens } = req.body;

    // In a real implementation, save to database or S3
    // For now, just log
    logger.info(`Design tokens saved for team ${teamId}`);

    res.json({ success: true });
  } catch (error) {
    logger.error('Save design tokens error:', error);
    res.status(500).json({ error: 'Failed to save design tokens' });
  }
});

/**
 * GET /v1/team/:teamId/design-tokens
 * Get team design tokens
 */
router.get('/:teamId/design-tokens', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Return sample tokens
    res.json({
      tokens: {
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
        spacing: {
          xs: '4px',
          sm: '8px',
          md: '16px',
          lg: '24px',
          xl: '32px',
        },
        typography: {
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: {
            sm: '14px',
            base: '16px',
            lg: '18px',
            xl: '20px',
          },
        },
      },
    });
  } catch (error) {
    logger.error('Get design tokens error:', error);
    res.status(500).json({ error: 'Failed to get design tokens' });
  }
});

// Helper function
function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 3; i++) {
    segments.push(Math.random().toString(36).substring(2, 6).toUpperCase());
  }
  return `FDH-${segments.join('-')}`;
}

export { router as teamRouter };
