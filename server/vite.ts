import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production deployment, the build output is in dist/public from the root
  const rootDistPath = path.resolve(process.cwd(), "dist", "public");
  const serverDistPath = path.resolve(__dirname, "..", "dist", "public");
  const fallbackDistPath = path.resolve(__dirname, "public");
  
  let finalDistPath = rootDistPath;
  
  // Try different possible locations for the built files
  if (fs.existsSync(rootDistPath)) {
    finalDistPath = rootDistPath;
  } else if (fs.existsSync(serverDistPath)) {
    finalDistPath = serverDistPath;
  } else if (fs.existsSync(fallbackDistPath)) {
    finalDistPath = fallbackDistPath;
  }

  if (!fs.existsSync(finalDistPath)) {
    console.error(`Build directory not found. Tried:
      - ${rootDistPath}
      - ${serverDistPath} 
      - ${fallbackDistPath}`);
    throw new Error(
      `Could not find the build directory. Make sure to build the client first.`,
    );
  }

  console.log(`Serving static files from: ${finalDistPath}`);
  console.log(`Files in directory:`, fs.readdirSync(finalDistPath));
  
  app.use(express.static(finalDistPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(finalDistPath, "index.html");
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  });
}
