
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Schema for join request
const joinRequestSchema = z.object({
  code: z.string().min(1, 'Company code is required'),
});

/**
 * Join Company by Code
 * Single server action for contractors to join a company using its profile code
 */
router.post('/join/accept', async (req: Request, res: Response) => {
  try {
    // Validate authenticated user
    let userId = req.user?.id;
    if (!userId && req.headers['x-user-id']) {
      userId = parseInt(req.headers['x-user-id'] as string);
    }

    if (!userId) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    // Validate request body
    const { code } = joinRequestSchema.parse(req.body);

    // Look up company by Profile Code
    const company = await storage.getUserByProfileCode(code);

    if (!company || company.role !== 'business') {
      return res.status(404).json({ 
        message: 'Invalid or expired link',
        code: 'INVALID_CODE' 
      });
    }

    // Check if relationship already exists
    const isAlreadyLinked = await storage.isContractorLinkedToBusiness(
      company.id,
      userId
    );

    if (isAlreadyLinked) {
      // Idempotent - already connected, return success
      return res.json({
        success: true,
        companyId: company.id,
        companyName: company.companyName || company.username,
        alreadyConnected: true
      });
    }

    // Create connection request as accepted (auto-join)
    await storage.createConnectionRequest({
      businessId: company.id,
      contractorId: userId,
      status: 'accepted',
      message: 'Joined via company onboarding link'
    });

    // Mark source as join_link for analytics
    console.log(`[JOIN_LINK] Contractor ${userId} joined company ${company.id} via profile code ${code}`);

    return res.json({
      success: true,
      companyId: company.id,
      companyName: company.companyName || company.username,
      alreadyConnected: false
    });

  } catch (error: any) {
    console.error('[JOIN_LINK] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: error.errors 
      });
    }

    return res.status(500).json({ 
      message: 'Failed to join company',
      code: 'INTERNAL_ERROR' 
    });
  }
});

/**
 * Get company info by code (for preview)
 */
router.get('/join/preview/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const company = await storage.getUserByProfileCode(code);

    if (!company || company.role !== 'business') {
      return res.status(404).json({ 
        message: 'Company not found',
        code: 'INVALID_CODE' 
      });
    }

    // Return safe public info
    return res.json({
      companyName: company.companyName || `${company.firstName} ${company.lastName}`.trim() || company.username,
      companyLogo: company.companyLogo,
      industry: company.industry
    });

  } catch (error) {
    console.error('[JOIN_PREVIEW] Error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch company info' 
    });
  }
});

export default router;
