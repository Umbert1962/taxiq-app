import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { pool, db, hasDatabase, getConnectionString } from "./db";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { admins } from "@shared/schema";
import fs from "fs";
import path from "path";

const app = express();
const httpServer = createServer(app);

let serverReady = false;

app.get("/__health", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/download/TaxiQ-Platform.zip", (_req, res) => {
  const filePath = path.resolve(import.meta.dirname, "..", "client", "public", "download", "TaxiQ-Platform.zip");
  if (fs.existsSync(filePath)) {
    res.download(filePath, "TaxiQ-Platform.zip");
  } else {
    res.status(404).send("File not found");
  }
});

app.get("/download/TaxiQ-iOS-Build.zip", (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  const filePath = path.resolve(import.meta.dirname, "..", "TaxiQ-iOS-Build.zip");
  if (fs.existsSync(filePath)) {
    res.download(filePath, "TaxiQ-iOS-Build.zip");
  } else {
    res.status(404).send("File not found");
  }
});

app.get("/download/TaxiQ-Passenger.aab", (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const filePath = path.resolve(import.meta.dirname, "..", "client", "public", "download", "TaxiQ-Passenger.aab");
  if (fs.existsSync(filePath)) {
    res.download(filePath, "TaxiQ-Passenger.aab");
  } else {
    res.status(404).send("File not found");
  }
});

app.get("/download/upload_certificate.pem", (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const filePath = path.resolve(import.meta.dirname, "..", "client", "public", "download", "upload_certificate.pem");
  if (fs.existsSync(filePath)) {
    res.download(filePath, "upload_certificate.pem");
  } else {
    res.status(404).send("File not found");
  }
});

app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "pl.com.taxiq.driver",
        sha256_cert_fingerprints: [
          "A5:28:11:23:37:9E:80:7F:32:CE:51:AC:37:39:BA:B4:29:7F:C7:EF:4B:31:A2:29:7B:29:6B:97:98:22:84:06",
          "05:BA:DF:93:73:66:81:97:CD:8D:40:42:90:1B:D9:CF:F1:67:FF:D8:4C:5F:EC:01:B5:A8:72:B5:0C:C3:4C:FA"
        ]
      }
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "pl.com.taxiq.twa",
        sha256_cert_fingerprints: [
          "05:BA:DF:93:73:66:81:97:CD:8D:40:42:90:1B:D9:CF:F1:67:FF:D8:4C:5F:EC:01:B5:A8:72:B5:0C:C3:4C:FA",
          "4F:36:12:E8:C2:09:98:D7:28:D0:46:70:41:3E:F4:F4:9C:1A:70:82:5D:2C:E9:D0:14:28:F8:1C:A7:7E:F0:24"
        ]
      }
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "pl.taxiq.passenger",
        sha256_cert_fingerprints: [
          "05:BA:DF:93:73:66:81:97:CD:8D:40:42:90:1B:D9:CF:F1:67:FF:D8:4C:5F:EC:01:B5:A8:72:B5:0C:C3:4C:FA",
          "50:7B:BF:82:53:E2:D9:E8:17:14:01:7B:C3:B2:91:02:91:6D:6B:24:51:1A:33:27:69:5B:5B:61:E2:7F:65:A4"
        ]
      }
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "pl.taxiq.driver",
        sha256_cert_fingerprints: [
          "05:BA:DF:93:73:66:81:97:CD:8D:40:42:90:1B:D9:CF:F1:67:FF:D8:4C:5F:EC:01:B5:A8:72:B5:0C:C3:4C:FA",
          "4F:36:12:E8:C2:09:98:D7:28:D0:46:70:41:3E:F4:F4:9C:1A:70:82:5D:2C:E9:D0:14:28:F8:1C:A7:7E:F0:24"
        ]
      }
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "pl.taxiq.app",
        sha256_cert_fingerprints: [
          "05:BA:DF:93:73:66:81:97:CD:8D:40:42:90:1B:D9:CF:F1:67:FF:D8:4C:5F:EC:01:B5:A8:72:B5:0C:C3:4C:FA",
          "4F:36:12:E8:C2:09:98:D7:28:D0:46:70:41:3E:F4:F4:9C:1A:70:82:5D:2C:E9:D0:14:28:F8:1C:A7:7E:F0:24"
        ]
      }
    }
  ]);
});

const isLocalDev = process.env.NODE_ENV === "development" && !process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL;
const port = parseInt(process.env.PORT || (isLocalDev ? "5001" : "5000"), 10);
httpServer.listen({ port, host: "0.0.0.0" }, () => {
  console.log(`[STARTUP] Listening on 0.0.0.0:${port}`);
  initializeServer();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    driverId?: string;
    driverName?: string;
    driverLastActivity?: number;
    passengerId?: string;
    passengerName?: string;
    passengerLastActivity?: number;
    companyId?: number;
    adminId?: number;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

async function seedDefaultAdmin() {
  if (!hasDatabase || !db) {
    console.log('[STARTUP] Admin seeding skipped (no database)');
    return;
  }
  try {
    const existingAdmins = await db.select().from(admins);
    if (existingAdmins.length === 0) {
      const bcrypt = await import('bcrypt');
      const hashedPwd = await bcrypt.hash('dev-only-temp', 10);
      await db.insert(admins).values({
        username: 'DevAdmin',
        password: hashedPwd,
        name: 'Dev Administrator',
        role: 'admin'
      });
      console.log('[STARTUP] Dev admin account created (dev only)');
    }
  } catch (error) {
    console.error('[STARTUP] Error seeding admin:', error);
  }
}

async function initializeServer() {
  try {
    console.log("[STARTUP] Beginning server initialization...");
    console.log("[STARTUP] NODE_ENV:", process.env.NODE_ENV);

    const requiredTwilioVars = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"];
    const missingTwilio = requiredTwilioVars.filter(v => !process.env[v]);
    if (missingTwilio.length > 0) {
      console.error(`[STARTUP] FATAL: Missing required Twilio env vars: ${missingTwilio.join(", ")}`);
      process.exit(1);
    }
    console.log("[STARTUP] Twilio: configured");

    app.use(
      express.json({
        verify: (req, _res, buf) => {
          req.rawBody = buf;
        },
      }),
    );
    app.use(express.urlencoded({ extended: false }));
    app.set('trust proxy', 1);

    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`[SESSION] Environment: ${process.env.NODE_ENV}, isProduction: ${isProduction}`);

    const isDevNoDb =
      process.env.NODE_ENV === "development" &&
      !process.env.NEON_DATABASE_URL &&
      !process.env.DATABASE_URL;

    if (isDevNoDb) {
      console.log("[SESSION] MemoryStore enabled (dev no database)");
      app.use(
        session({
          secret: "dev-secret",
          resave: false,
          saveUninitialized: false,
        })
      );
    } else {
      const connectPgSimple = (await import("connect-pg-simple")).default;
      const PgStore = connectPgSimple(session);
      app.use(
        session({
          store: new PgStore({
            conString: getConnectionString(),
            tableName: 'session',
            createTableIfMissing: true
          }),
          secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
          name: 'taxiq.sid.v2',
          resave: false,
          saveUninitialized: false,
          proxy: true,
          rolling: true,
          cookie: {
            secure: isProduction,
            httpOnly: true,
            maxAge: 365 * 24 * 60 * 60 * 1000,
            sameSite: isProduction ? 'strict' as const : 'lax' as const,
            path: '/'
          }
        })
      );
      console.log("[SESSION] Using PostgreSQL session store");
    }

    app.use((req, _res, next) => {
      if (isProduction) {
        const ua = req.headers['user-agent'] || '';
        const isAndroidWebView = /wv\)/.test(ua) || /Android.*Version\/[\d.]+/.test(ua);
        const isCapacitor = ua.includes('Capacitor') || req.headers['x-requested-with'] === 'pl.taxiq.app' || req.headers['x-requested-with'] === 'pl.com.taxiq.driver';
        const isHttp = req.protocol === 'http' && !req.headers['x-forwarded-proto'];
        if (isAndroidWebView || isCapacitor || isHttp) {
          req.session.cookie.secure = false;
          req.session.cookie.sameSite = 'lax';
        }
      }
      next();
    });

    app.use((req, _res2, next) => {
      const hasSession = req.session.driverId || req.session.passengerId || req.session.companyId || req.session.adminId;
      const isSessionEndpoint = req.path.includes('/session') || req.path.includes('/me');
      if (isSessionEndpoint && hasSession) {
        const rawCookie = req.headers.cookie || '';
        const hasSidCookie = rawCookie.includes('taxiq.sid.v2');
        console.log(`[COOKIE_CHECK] ${req.method} ${req.path} | cookie present: ${hasSidCookie ? 'YES' : 'NO'} | host: ${req.headers.host || '(none)'} | origin: ${req.headers.origin || '(none)'}`);
        if (!hasSidCookie) {
          console.log(`[COOKIE_CHECK] MISSING cookie details | referer: ${req.headers.referer || '(none)'} | ua: ${(req.headers['user-agent'] || '').slice(0, 80)}`);
        }
      }
      if (req.session.passengerId) {
        req.session.passengerLastActivity = Date.now();
      }
      if (req.session.driverId) {
        req.session.driverLastActivity = Date.now();
      }
      next();
    });

    app.use((req, res, next) => {
      const start = Date.now();
      const reqPath = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;
      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };
      res.on("finish", () => {
        const duration = Date.now() - start;
        if (reqPath.startsWith("/api")) {
          let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }
          log(logLine);
        }
      });
      next();
    });

    if (process.env.NODE_ENV !== 'production') {
      await seedDefaultAdmin();
      console.log("[STARTUP] Admin seeded (dev only)");
    } else {
      console.log("[STARTUP] Admin seeding skipped (production)");
    }

    try {
      await pool.query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMP`);
      await pool.query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS search_started_at TIMESTAMP`);
      await pool.query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_notification_count JSONB DEFAULT '{}'`);
      console.log("[STARTUP] Rides table columns verified");
    } catch (migrationErr: any) {
      console.error("[STARTUP] Rides migration error:", migrationErr.message);
    }

    // Initialize Firebase Cloud Messaging (if configured)
    const { initializeFCM } = await import("./fcm");
    const fcmReady = initializeFCM();
    console.log(`[STARTUP] FCM: ${fcmReady ? 'enabled' : 'not configured (Web Push only)'}`);

    await registerRoutes(httpServer, app);
    console.log("[STARTUP] Routes registered");

    const { startInvoiceScheduler } = await import("./invoice-scheduler");
    startInvoiceScheduler();
    console.log("[STARTUP] Invoice scheduler started");

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });

    const distPath = path.resolve(import.meta.dirname, "public");
    const hasBuiltAssets = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, "index.html"));
    console.log("[STARTUP] distPath:", distPath, "hasBuiltAssets:", hasBuiltAssets);

    if (hasBuiltAssets) {
      serveStatic(app);
      console.log("[STARTUP] Static files configured (production mode)");
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      console.log("[STARTUP] Vite configured (development mode)");
    }

    serverReady = true;
    console.log(`[STARTUP] Server fully initialized on 0.0.0.0:${port}`);
  } catch (error) {
    console.error("[STARTUP] FATAL ERROR during server initialization:", error);
    process.exit(1);
  }
}
