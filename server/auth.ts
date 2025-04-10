import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Function to compare passwords
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Configure passport and session
export function setupAuth(app: Express) {
  // Generate a random secret if none is provided
  if (!process.env.SESSION_SECRET) {
    console.warn("No SESSION_SECRET provided, using a random string. This will invalidate sessions on restart.");
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'creativlinc-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to false for development, even if in "production" mode on Replit
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      sameSite: 'lax', // Helps with CSRF protection while allowing normal navigation
      path: '/',
    },
    // Use the storage implementation's session store
    store: storage.sessionStore
  };

  // Configure Express to trust proxy headers when in production
  // This is needed for secure cookies to work behind a proxy
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Setup session middleware
  app.use(session(sessionSettings));
  
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport with local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Configure how users are stored in the session
  passport.serializeUser((user, done) => done(null, user.id));
  
  // Configure how users are retrieved from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || undefined);
    } catch (error) {
      done(error);
    }
  });

  // Register authentication routes
  
  // Registration route
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check if there's an invite associated with this registration
      let inviteId = req.body.inviteId ? parseInt(req.body.inviteId) : null;
      let invite = null;
      
      if (inviteId) {
        invite = await storage.getInvite(inviteId);
        if (!invite) {
          return res.status(400).json({ error: "Invalid invitation" });
        }
        
        // Make sure the email matches the invitation
        if (invite.email.toLowerCase() !== req.body.email.toLowerCase()) {
          return res.status(400).json({ error: "Email does not match the invitation" });
        }
        
        // Check if the invite has expired
        if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
          return res.status(400).json({ error: "Invitation has expired" });
        }
        
        // Check if the invite is already accepted
        if (invite.status !== 'pending') {
          return res.status(400).json({ error: "Invitation has already been used" });
        }
      }

      // Create the user
      const hashedPassword = await hashPassword(req.body.password);
      
      // Add worker type from invite if available
      const userData = {
        ...req.body,
        password: hashedPassword,
        role: req.body.role || 'contractor', // Default to contractor role for invited users
        workerType: invite?.workerType || req.body.workerType || 'contractor'
      };
      
      const user = await storage.createUser(userData);

      // If this registration came from an invite, update the invite status
      if (invite) {
        await storage.updateInvite(invite.id, { 
          status: 'accepted'
        });
        
        // If the invite is associated with a contract, create one automatically
        if (invite.projectId && invite.contractDetails) {
          try {
            // Create a contract based on the invite details
            await storage.createContract({
              businessId: invite.businessId,
              contractorId: user.id,
              contractName: invite.projectName,
              contractCode: `${invite.projectName.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(9)}`,
              value: invite.paymentAmount || '0',
              status: 'pending_approval',
              description: invite.contractDetails,
              startDate: new Date(),
              endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)), // Default 3 months duration
              createdAt: new Date()
            });
          } catch (contractError) {
            console.error('Error creating contract from invite:', contractError);
            // Continue with user creation even if contract creation fails
          }
        }
        
        // Send a welcome email to the newly registered user
        try {
          const { sendContractCreatedEmail } = await import('./services/email');
          const appUrl = `${req.protocol}://${req.get('host')}`;
          
          await sendContractCreatedEmail({
            contractName: invite.projectName,
            contractCode: `${invite.projectName.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(9)}`,
            value: invite.paymentAmount || '0',
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
          }, user.email, appUrl);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Continue with login even if email fails
        }
      }

      // Log the user in automatically after registration
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user info without the password
        const { password, ...userInfo } = user;
        res.status(201).json({
          ...userInfo,
          fromInvite: invite ? true : false,
          inviteDetails: invite ? {
            projectName: invite.projectName,
            businessId: invite.businessId
          } : null
        });
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) return next(err);
      
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid username or password" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user info without the password
        const { password, ...userInfo } = user;
        res.status(200).json(userInfo);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return user info without the password
    const { password, ...userInfo } = req.user as Express.User;
    res.json(userInfo);
  });

  // Create middleware to check user authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  };

  return { requireAuth };
}