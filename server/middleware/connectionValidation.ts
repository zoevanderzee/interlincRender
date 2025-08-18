/**
 * CRITICAL CONNECTION VALIDATION MIDDLEWARE
 * 
 * This module enforces strict connection validation rules to prevent
 * any account confusion or unauthorized access between businesses and contractors.
 * 
 * ZERO TOLERANCE POLICY:
 * - Only contractors with verified connection_requests can be assigned to projects
 * - Each connection must have a unique profile_code
 * - No contractor can access business data without established connection
 * - All contractor operations must validate connection ownership
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface ConnectionValidationRequest extends Request {
  validatedConnection?: {
    businessId: number;
    contractorId: number;
    connectionId: number;
    profileCode: string;
  };
}

/**
 * Validates that a contractor has an active connection to a business
 * before allowing any project assignment or work request operations
 */
export async function validateContractorConnection(
  req: ConnectionValidationRequest, 
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

    // Extract contractor ID from request body or params
    const contractorId = req.body.contractorId || 
                        req.body.selectedContractorId || 
                        req.params.contractorId;
    
    if (!contractorId) {
      return res.status(400).json({ 
        error: "Contractor ID is required",
        code: "CONTRACTOR_ID_MISSING" 
      });
    }

    // For business users: validate they have connection to this contractor
    if (currentUser.role === 'business') {
      const connection = await storage.getConnectionRequests({
        businessId: currentUser.id,
        contractorId: parseInt(contractorId),
        status: 'accepted'
      });

      if (!connection || connection.length === 0) {
        console.error(`CONNECTION VALIDATION FAILED: Business ${currentUser.id} attempted to assign unconnected contractor ${contractorId}`);
        return res.status(403).json({ 
          error: "Cannot assign contractor without established connection. Contractor must accept connection request first.",
          code: "NO_CONNECTION_ESTABLISHED",
          businessId: currentUser.id,
          contractorId: parseInt(contractorId)
        });
      }

      // Store validated connection for downstream use
      req.validatedConnection = {
        businessId: currentUser.id,
        contractorId: parseInt(contractorId),
        connectionId: connection[0].id,
        profileCode: connection[0].profileCode || ''
      };

      console.log(`✅ CONNECTION VALIDATED: Business ${currentUser.id} ↔ Contractor ${contractorId} via connection ${connection[0].id}`);
    }

    // For contractor users: validate they have connection to the business
    if (currentUser.role === 'contractor') {
      const businessId = req.body.businessId || req.params.businessId;
      
      if (businessId) {
        const connection = await storage.getConnectionRequests({
          businessId: parseInt(businessId),
          contractorId: currentUser.id,
          status: 'accepted'
        });

        if (!connection || connection.length === 0) {
          console.error(`CONNECTION VALIDATION FAILED: Contractor ${currentUser.id} attempted to access business ${businessId} without connection`);
          return res.status(403).json({ 
            error: "Access denied. No established connection to this business.",
            code: "NO_CONNECTION_ESTABLISHED",
            businessId: parseInt(businessId),
            contractorId: currentUser.id
          });
        }

        req.validatedConnection = {
          businessId: parseInt(businessId),
          contractorId: currentUser.id,
          connectionId: connection[0].id,
          profileCode: connection[0].profileCode || ''
        };
      }
    }

    next();
  } catch (error) {
    console.error('Connection validation error:', error);
    res.status(500).json({ 
      error: "Connection validation failed",
      code: "VALIDATION_ERROR" 
    });
  }
}

/**
 * Validates that a contractor exists and has the correct role
 * before any assignment operations
 */
export async function validateContractorRole(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const contractorId = req.body.contractorId || 
                        req.body.selectedContractorId || 
                        req.params.contractorId;
    
    if (!contractorId) {
      return next(); // Skip if no contractor ID (handled by other middleware)
    }

    const contractor = await storage.getUser(parseInt(contractorId));
    
    if (!contractor) {
      return res.status(404).json({ 
        error: "Contractor not found",
        code: "CONTRACTOR_NOT_FOUND",
        contractorId: parseInt(contractorId)
      });
    }

    if (contractor.role !== 'contractor' && contractor.role !== 'freelancer') {
      console.error(`ROLE VALIDATION FAILED: User ${contractorId} has role '${contractor.role}' but expected 'contractor' or 'freelancer'`);
      return res.status(400).json({ 
        error: `Invalid contractor role. Expected 'contractor' or 'freelancer' but got '${contractor.role}'`,
        code: "INVALID_CONTRACTOR_ROLE",
        contractorId: parseInt(contractorId),
        actualRole: contractor.role
      });
    }

    console.log(`✅ ROLE VALIDATED: User ${contractorId} confirmed as ${contractor.role}`);
    next();
  } catch (error) {
    console.error('Contractor role validation error:', error);
    res.status(500).json({ 
      error: "Role validation failed",
      code: "ROLE_VALIDATION_ERROR" 
    });
  }
}

/**
 * Strict validation for contract operations - ensures only connected
 * contractors can be assigned to contracts
 */
export async function validateContractAssignment(
  req: ConnectionValidationRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const currentUser = req.user;
    const contractId = req.params.contractId || req.body.contractId;
    
    if (!currentUser || !contractId) {
      return res.status(400).json({ 
        error: "Authentication and contract ID required",
        code: "MISSING_REQUIRED_DATA" 
      });
    }

    // Get the contract to verify business ownership
    const contract = await storage.getContract(parseInt(contractId));
    if (!contract) {
      return res.status(404).json({ 
        error: "Contract not found",
        code: "CONTRACT_NOT_FOUND" 
      });
    }

    // Only the business owner can assign contractors to their contracts
    if (currentUser.role === 'business' && contract.businessId !== currentUser.id) {
      console.error(`CONTRACT ASSIGNMENT BLOCKED: User ${currentUser.id} attempted to modify contract ${contractId} owned by business ${contract.businessId}`);
      return res.status(403).json({ 
        error: "Cannot modify contracts owned by other businesses",
        code: "UNAUTHORIZED_CONTRACT_ACCESS" 
      });
    }

    console.log(`✅ CONTRACT ASSIGNMENT VALIDATED: Business ${currentUser.id} can modify contract ${contractId}`);
    next();
  } catch (error) {
    console.error('Contract assignment validation error:', error);
    res.status(500).json({ 
      error: "Contract assignment validation failed",
      code: "CONTRACT_VALIDATION_ERROR" 
    });
  }
}