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

router.get("/api/pending-registrations/:email", async (req: Request, res: Response) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    const pendingRegistration = await storage.getPendingRegistrationByEmail(email);
    
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

router.delete("/api/pending-registrations/:email", async (req: Request, res: Response) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    await storage.deletePendingRegistrationByEmail(email);
    
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
