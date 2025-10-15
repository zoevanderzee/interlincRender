import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { insertPendingRegistrationSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.post("/api/pending-registrations", async (req: Request, res: Response) => {
  try {
    const validationResult = insertPendingRegistrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid registration data", 
        details: validationResult.error.errors 
      });
    }

    const pendingRegistration = await storage.createPendingRegistration(validationResult.data);
    
    res.status(201).json(pendingRegistration);
  } catch (error: any) {
    console.error("Error creating pending registration:", error);
    res.status(500).json({ 
      error: "Failed to store registration data", 
      details: error.message 
    });
  }
});

router.get("/api/pending-registrations/:firebaseUid", async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.params.firebaseUid;
    
    const pendingRegistration = await storage.getPendingRegistrationByFirebaseUid(firebaseUid);
    
    if (!pendingRegistration) {
      return res.status(404).json({ error: "No pending registration found" });
    }
    
    res.json(pendingRegistration);
  } catch (error: any) {
    console.error("Error fetching pending registration:", error);
    res.status(500).json({ 
      error: "Failed to retrieve registration data", 
      details: error.message 
    });
  }
});

router.delete("/api/pending-registrations/:firebaseUid", async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.params.firebaseUid;
    
    await storage.deletePendingRegistrationByFirebaseUid(firebaseUid);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting pending registration:", error);
    res.status(500).json({ 
      error: "Failed to delete registration data", 
      details: error.message 
    });
  }
});

export default router;
