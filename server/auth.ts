import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
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
  return await bcrypt.compare(supplied, stored);
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
    saveUninitialized: false, // Critical: Don't save empty sessions
    name: 'creativlinc.sid',
    rolling: false,
    cookie: {
      secure: false, // Keep false for Replit deployment compatibility
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: false, // Allow frontend access to cookies in deployed environment
      sameSite: 'lax', // Use lax for better compatibility
      path: '/',
      domain: undefined,
    },
    // Use the storage implementation's session store
    store: storage.sessionStore
  };
  
  // Log session configuration for debugging
  console.log("Session configuration:", {
    secret: sessionSettings.secret ? "HIDDEN" : "NOT SET",
    resave: sessionSettings.resave,
    saveUninitialized: sessionSettings.saveUninitialized,
    name: sessionSettings.name,
    cookie: {
      secure: sessionSettings.cookie?.secure,
      maxAge: sessionSettings.cookie?.maxAge,
      httpOnly: sessionSettings.cookie?.httpOnly,
      sameSite: sessionSettings.cookie?.sameSite,
    },
    storePresent: !!sessionSettings.store
  });
  
  // Don't clear sessions on startup anymore to maintain user sessions
  console.log('Session store initialized, keeping existing sessions');

  // Configure Express to trust proxy headers in all environments
  // This is needed for cookies to work properly in Replit
  app.set("trust proxy", 1);

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

        // Check if email is verified (allow login for existing users without verification for backward compatibility)
        if (user.emailVerified === false && user.emailVerificationToken) {
          return done(null, false, { 
            message: "Please verify your email address before logging in",
            requiresEmailVerification: true,
            email: user.email
          });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Configure how users are stored in the session
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });
  
  // Configure how users are retrieved from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      // If id is undefined or null, return undefined
      if (id === undefined || id === null) {
        console.log("Deserializing with undefined/null user ID");
        return done(null, undefined);
      }
      
      console.log("Deserializing user with ID:", id);
      const user = await storage.getUser(id);
      
      // If no user found, return undefined instead of null
      if (!user) {
        console.log(`No user found with ID: ${id}`);
        return done(null, undefined);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      return done(error);
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

      // Check if the email is already registered
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Variables to track registration source
      let invite = null;
      let businessToken = null;
      let businessInfo = null;
      
      // Check if there's a specific project invite associated with this registration
      if (req.body.inviteId) {
        const inviteId = parseInt(req.body.inviteId);
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
      
      // Check if there's a business invite token associated with this registration
      if (req.body.token) {
        const tokenInfo = await storage.verifyOnboardingToken(req.body.token);
        
        if (!tokenInfo) {
          return res.status(400).json({ error: "Invalid or expired business invite link" });
        }
        
        businessToken = req.body.token;
        businessInfo = tokenInfo;
      }

      // Create the user
      const hashedPassword = await hashPassword(req.body.password);
      
      // Determine user role and worker type based on registration source
      let role = 'business'; // Default role
      let workerType = null; // Default worker type
      let businessId = null; // For tracking business relationship
      
      // Project-specific invitation takes precedence
      if (invite) {
        role = 'contractor';
        workerType = invite.workerType || 'contractor';
        businessId = invite.businessId;
      } 
      // Business invite link
      else if (businessInfo) {
        role = 'contractor';
        workerType = businessInfo.workerType || 'contractor';
        businessId = businessInfo.businessId;
      }
      // Manual setting (if provided in request)
      else {
        role = req.body.role || 'business';
        workerType = req.body.workerType || null;
      }
      
      // Add worker type from invite if available
      const userData = {
        ...req.body,
        password: hashedPassword,
        role: role,
        workerType: workerType,
        // If this was a business invite registration, record the referring business
        referredByBusinessId: businessId,
        // Ensure subscription status is set for new users
        subscriptionStatus: invite || businessInfo ? 'active' : 'inactive'
      };
      
      const user = await storage.createUser(userData);

      // Business users need to complete Trolley onboarding separately
      // This will be handled via redirect to business-setup page after login

      // Handle project-specific invitation
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
              endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)) // Default 3 months duration
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
      
      // Handle business invite link registration
      if (businessToken && businessInfo) {
        try {
          // Record the onboarding link usage
          await storage.recordOnboardingUsage(businessInfo.businessId, user.id, businessToken);
          
          // Send welcome email to the newly registered contractor
          try {
            const { sendEmail } = await import('./services/email');
            const business = await storage.getUser(businessInfo.businessId);
            const businessName = business ? (business.companyName || `${business.firstName || ''} ${business.lastName || ''}`).trim() : "Your client";
            const appUrl = `${req.protocol}://${req.get('host')}`;
            
            await sendEmail({
              to: user.email,
              subject: `Welcome to ${businessName}'s Team on Creativ Linc`,
              text: `Welcome to Creativ Linc!\n\n${businessName} has invited you to join their team as a ${businessInfo.workerType || 'contractor'}. You can now login to view your projects and contracts.\n\nVisit ${appUrl} to get started.`,
              html: `<h1>Welcome to Creativ Linc!</h1>
                     <p><strong>${businessName}</strong> has invited you to join their team as a ${businessInfo.workerType || 'contractor'}.</p>
                     <p>You can now login to view your projects and contracts.</p>
                     <p><a href="${appUrl}" style="background-color: #000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Get Started</a></p>`
            });
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Continue with login even if email fails
          }
        } catch (usageError) {
          console.error('Error recording business invite usage:', usageError);
          // Continue with user creation even if usage recording fails
        }
      }

      // Check if user needs subscription before logging in
      // New users who registered directly (not from invites) need subscriptions
      const isNewUser = !user.subscriptionStatus || user.subscriptionStatus === 'inactive';
      const isDirectRegistration = !invite && !businessInfo;
      const needsSubscription = isNewUser && isDirectRegistration && (user.role === 'business' || user.role === 'contractor');
      
      if (needsSubscription) {
        // Don't log in the user - return subscription required
        const { password, ...userInfo } = user;
        return res.status(201).json({
          ...userInfo,
          requiresSubscription: true,
          fromInvite: false,
          fromBusinessInvite: false
        });
      }

      // Log the user in automatically after registration (for invites or existing subscribers)
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
          } : null,
          fromBusinessInvite: businessInfo ? true : false,
          businessInviteDetails: businessInfo ? {
            businessId: businessInfo.businessId,
            workerType: businessInfo.workerType
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
    // Log request headers for debugging
    console.log("Login request headers:", {
      cookie: req.headers.cookie,
      'user-agent': req.headers['user-agent']
    });
    
    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed - invalid credentials");
        return res.status(401).json({ error: info?.message || "Invalid username or password" });
      }
      
      // Log in the user (create the session)
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session creation error:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login successful for user:", user.id, "Session ID:", req.sessionID);
        
        // Return user info without the password
        const { password, ...userInfo } = user;
        
        // Force immediate session save to ensure the cookie is set
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return next(saveErr);
          }
          
          // Save the session before responding
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Session save error:', saveErr);
            }
          });
          
          // Log response headers being sent back
          console.log("Login response - setting cookie:", {
            'Set-Cookie': res.getHeader('Set-Cookie'),
            sessionID: req.sessionID
          });
          
          return res.status(200).json({
            ...userInfo,
            emailVerified: userInfo.emailVerified
          });
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    const sessionID = req.sessionID;
    console.log("Logging out session:", sessionID);
    
    req.logout((err) => {
      if (err) return next(err);
      
      // Destroy the session
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destruction error:", destroyErr);
          return next(destroyErr);
        }
        res.clearCookie('creativlinc.sid');
        res.sendStatus(200);
      });
    });
  });

  // Get current user route
  app.get("/api/user", async (req, res) => {
    console.log("Auth check for session:", req.sessionID, "Authenticated:", req.isAuthenticated());
    
    // Log request headers for debugging
    console.log("User API request headers:", {
      cookie: req.headers.cookie,
      'user-agent': req.headers['user-agent'],
      'x-user-id': req.headers['x-user-id']
    });
    
    // Check if user is authenticated via session
    if (req.isAuthenticated()) {
      // Return user info without the password
      const { password, ...userInfo } = req.user as Express.User;
      return res.json(userInfo);
    }
    
    // Fallback: Check X-User-ID header for localStorage-based authentication
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
      try {
        const userId = parseInt(userIdHeader as string);
        if (!isNaN(userId)) {
          const user = await storage.getUser(userId);
          if (user) {
            console.log(`Authenticating /api/user request via X-User-ID header: ${userId}`);
            // Return user info without the password
            const { password, ...userInfo } = user;
            return res.json(userInfo);
          }
        }
      } catch (error) {
        console.error('Error in X-User-ID fallback for /api/user:', error);
      }
    }
    
    // If all authentication methods fail
    return res.status(401).json({ error: "Not authenticated" });
  });

  // Forgot password route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal that the user doesn't exist
        return res.status(200).json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
      
      // Generate a reset token
      const token = randomBytes(32).toString('hex');
      
      // Set token expiration (1 hour from now)
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);
      
      // Save token to user record
      await storage.setPasswordResetToken(email, token, expires);
      
      try {
        // Send password reset email using our email service
        const { sendPasswordResetEmail } = await import('./services/email');
        const appUrl = `${req.protocol}://${req.get('host')}`;
        await sendPasswordResetEmail(email, token, appUrl);
        console.log(`Password reset email sent for ${email}`);
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Continue the process even if email fails - user can request again
      }
      
      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: "An error occurred while processing your request." });
    }
  });
  
  // Reset password route
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }
      
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
      
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: "An error occurred while processing your request." });
    }
  });

  // Create middleware to check user authentication
  const requireAuth = async (req: any, res: any, next: any) => {
    console.log("Auth check in requireAuth middleware:", req.isAuthenticated(), "Session ID:", req.sessionID);
    
    // Log request headers for debugging
    console.log("API request headers in requireAuth:", {
      cookie: req.headers.cookie,
      'user-agent': req.headers['user-agent'],
      'x-user-id': req.headers['x-user-id'],
      path: req.path
    });
    
    // Debug session information
    console.log("Session data:", {
      isSessionDefined: !!req.session,
      sessionID: req.sessionID,
      userID: req.session?.passport?.user,
      passportInitialized: !!req.session?.passport,
      passport: req.session?.passport
    });
    
    // First check traditional session-based authentication
    if (req.isAuthenticated()) {
      return next();
    }
    
    // Fallback: Check for X-User-ID header and attempt to load the user
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
      try {
        const userId = parseInt(userIdHeader);
        if (!isNaN(userId)) {
          const user = await storage.getUser(userId);
          if (user) {
            console.log(`Using X-User-ID header fallback authentication for user ID: ${userId}`);
            // Manually set user on request object
            req.user = user;
            return next();
          }
        }
      } catch (error) {
        console.error('Error in X-User-ID fallback authentication:', error);
      }
    }
    
    // If all authentication methods fail
    return res.status(401).json({ error: "Not authenticated" });
  };

  return { requireAuth };
}