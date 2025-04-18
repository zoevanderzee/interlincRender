import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeEmailService } from "./services/email";
import { initializeLogger, requestLogger, errorLogger } from "./services/logger";
import { addCsrfToken, csrfProtection } from "./middleware/csrf";
import { securityHeaders } from "./middleware/security-headers";
import { setupDatabaseHealthChecks } from "./services/db-health";
import { apiErrorHandler } from "./middleware/error-handler";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize services
  initializeEmailService();
  await initializeLogger();

  // Setup database health checks (every 5 minutes)
  setupDatabaseHealthChecks();

  // Add the request logger middleware
  app.use(requestLogger);

  // Temporarily disable all security enhancements to restore basic functionality
  // app.use(securityHeaders);
  // app.use(addCsrfToken);
  // app.use('/api', csrfProtection);

  // Serve test login HTML
  app.get('/test-login-html', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'client', 'test-login.html'));
  });

  const port = process.env.PORT || 5000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
await registerRoutes(app);

  // Use our error logger middleware
  app.use(errorLogger);

  // Use standardized API error handler
  app.use(apiErrorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();