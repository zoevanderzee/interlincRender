
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface TenantValidatedRequest extends Request {
  tenantValidation?: {
    businessId: number;
    contractorId: number;
    validated: boolean;
  };
}

/**
 * BULLETPROOF TENANT ISOLATION MIDDLEWARE
 * 
 * Prevents any cross-tenant data access in a multi-business, multi-contractor system.
 * Each business can only see their connected contractors.
 * Each contractor can only see their connected businesses.
 */
export async function validateTenantIsolation(
  req: TenantValidatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED" 
      });
    }

    // Extract target user IDs from request
    const contractorId = req.body.contractorId || 
                        req.body.selectedContractorId || 
                        req.params.contractorId ||
                        req.query.contractorId;
    
    const businessId = req.body.businessId || 
                      req.params.businessId ||
                      req.query.businessId;

    // Validate business accessing contractor data
    if (currentUser.role === 'business' && contractorId) {
      const validation = await storage.validateTenantIsolation(
        currentUser.id, 
        parseInt(contractorId)
      );

      if (!validation.allowed) {
        console.error(`TENANT ISOLATION VIOLATION: Business ${currentUser.id} attempted to access contractor ${contractorId} - ${validation.reason}`);
        return res.status(403).json({ 
          error: "Access denied: No verified connection to this contractor",
          code: "TENANT_ISOLATION_VIOLATION",
          businessId: currentUser.id,
          contractorId: parseInt(contractorId),
          reason: validation.reason
        });
      }

      req.tenantValidation = {
        businessId: currentUser.id,
        contractorId: parseInt(contractorId),
        validated: true
      };
    }

    // Validate contractor accessing business data
    if ((currentUser.role === 'contractor' || currentUser.role === 'freelancer') && businessId) {
      const validation = await storage.validateTenantIsolation(
        currentUser.id, 
        parseInt(businessId)
      );

      if (!validation.allowed) {
        console.error(`TENANT ISOLATION VIOLATION: Contractor ${currentUser.id} attempted to access business ${businessId} - ${validation.reason}`);
        return res.status(403).json({ 
          error: "Access denied: No verified connection to this business",
          code: "TENANT_ISOLATION_VIOLATION",
          contractorId: currentUser.id,
          businessId: parseInt(businessId),
          reason: validation.reason
        });
      }

      req.tenantValidation = {
        businessId: parseInt(businessId),
        contractorId: currentUser.id,
        validated: true
      };
    }

    console.log(`✅ TENANT ISOLATION VALIDATED: User ${currentUser.id} (${currentUser.role}) accessing ${contractorId ? `contractor ${contractorId}` : businessId ? `business ${businessId}` : 'own data'}`);
    next();

  } catch (error) {
    console.error('Tenant isolation validation error:', error);
    res.status(500).json({ 
      error: "Security validation failed",
      code: "TENANT_VALIDATION_ERROR" 
    });
  }
}

/**
 * Middleware specifically for contractor assignment operations
 */
export async function validateContractorAssignment(
  req: TenantValidatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const currentUser = req.user;
    if (!currentUser || currentUser.role !== 'business') {
      return res.status(403).json({ 
        error: "Only business users can assign contractors",
        code: "BUSINESS_ONLY_OPERATION" 
      });
    }

    const contractorId = req.body.contractorId || req.params.contractorId;
    if (!contractorId) {
      return res.status(400).json({ 
        error: "Contractor ID is required",
        code: "CONTRACTOR_ID_MISSING" 
      });
    }

    // Verify business has verified connection to this contractor
    const hasConnection = await storage.validateBusinessContractorConnection(
      currentUser.id, 
      parseInt(contractorId)
    );

    if (!hasConnection) {
      console.error(`ASSIGNMENT BLOCKED: Business ${currentUser.id} attempted to assign unconnected contractor ${contractorId}`);
      return res.status(403).json({ 
        error: "Cannot assign contractor without verified connection",
        code: "NO_VERIFIED_CONNECTION",
        businessId: currentUser.id,
        contractorId: parseInt(contractorId)
      });
    }

    console.log(`✅ CONTRACTOR ASSIGNMENT VALIDATED: Business ${currentUser.id} can assign contractor ${contractorId}`);
    next();

  } catch (error) {
    console.error('Contractor assignment validation error:', error);
    res.status(500).json({ 
      error: "Assignment validation failed",
      code: "ASSIGNMENT_VALIDATION_ERROR" 
    });
  }
}
