import type { Express, Request, Response } from "express";
import { db } from "./db";
import { drivers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage, hashPassword } from "./storage";
import { normalizePolishPhone } from "./geo";
import {
  requestAccess,
  verifyOtp,
  setPin,
  loginWithPin,
  forgotPin,
  invalidateSessionsByRole,
  findUserByPhone,
  maskPhone,
  AuthError,
} from "./auth-service";

export function registerDriverAuthRoutes(app: Express): void {

  app.post("/auth/request-access", async (req: Request, res: Response) => {
    try {
      const { phone, role } = req.body;
      if (!phone) return res.status(400).json({ error: "Podaj numer telefonu" });
      const targetRole = role || undefined;
      const result = await requestAccess(phone, role === "passenger", targetRole);
      (req.session as any).authRole = result.role;
      (req.session as any).authUserId = result.userId;
      res.json({ status: result.status, role: result.role });
    } catch (err: any) {
      const status = err instanceof AuthError ? err.statusCode : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const { phone, pin, role, lat, lng } = req.body;
      if (!phone || !pin) return res.status(400).json({ error: "Podaj telefon i PIN" });
      const targetRole = role || undefined;
      const result = await loginWithPin(phone, pin, targetRole);

      await invalidateSessionsByRole(result.role, result.userId);

      if (result.role === "driver") {
        (req.session as any).driverId = result.userId;
        if (lat && lng) {
          await db.update(drivers).set({ currentLat: lat, currentLng: lng }).where(eq(drivers.id, result.userId));
        }
      } else if (result.role === "passenger") {
        (req.session as any).passengerId = result.userId;
      } else if (result.role === "admin") {
        (req.session as any).adminId = result.userId;
      }

      (req.session as any).authRole = result.role;
      (req.session as any).authUserId = result.userId;

      console.log(`[AUTH] Login success: ${result.role} ${maskPhone(phone)} (id: ${result.userId})`);
      res.json({ status: "LOGGED_IN", role: result.role, name: result.name });
    } catch (err: any) {
      const status = err instanceof AuthError ? err.statusCode : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.post("/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { phone, otp, role } = req.body;
      if (!phone || !otp) return res.status(400).json({ error: "Podaj telefon i kod OTP" });
      const targetRole = role || undefined;
      const result = await verifyOtp(phone, otp, targetRole);
      (req.session as any).authRole = result.role;
      (req.session as any).authUserId = result.userId;
      (req.session as any).otpVerified = true;
      res.json({ status: result.status, role: result.role });
    } catch (err: any) {
      const status = err instanceof AuthError ? err.statusCode : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.post("/auth/set-pin", async (req: Request, res: Response) => {
    try {
      const { phone, pin, role } = req.body;
      if (!phone || !pin) return res.status(400).json({ error: "Podaj telefon i PIN" });

      const verifiedUserId = (req.session as any).authUserId;
      if (!verifiedUserId) return res.status(403).json({ error: "Najpierw zweryfikuj kod OTP" });

      const targetRole = role || undefined;
      const result = await setPin(phone, pin, verifiedUserId, targetRole);

      await invalidateSessionsByRole(result.role, result.userId);

      if (result.role === "driver") {
        (req.session as any).driverId = result.userId;
      } else if (result.role === "passenger") {
        (req.session as any).passengerId = result.userId;
      } else if (result.role === "admin") {
        (req.session as any).adminId = result.userId;
      }

      (req.session as any).authRole = result.role;
      (req.session as any).authUserId = result.userId;

      console.log(`[AUTH] PIN set + login: ${result.role} (id: ${result.userId})`);
      res.json({ status: "PIN_SET", role: result.role, name: result.name });
    } catch (err: any) {
      const status = err instanceof AuthError ? err.statusCode : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.post("/auth/forgot-pin", async (req: Request, res: Response) => {
    try {
      const { phone, role } = req.body;
      if (!phone) return res.status(400).json({ error: "Podaj numer telefonu" });
      const targetRole = role || undefined;
      const result = await forgotPin(phone, targetRole);
      (req.session as any).authRole = result.role;
      (req.session as any).authUserId = result.userId;
      res.json({ status: result.status });
    } catch (err: any) {
      const status = err instanceof AuthError ? err.statusCode : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.get("/api/drivers/session", async (req: Request, res: Response) => {
    try {
      const driverId = (req.session as any)?.driverId;
      if (!driverId) return res.status(401).json({ error: "Not authenticated" });
      const driver = await storage.getDriver(driverId);
      if (!driver) return res.status(401).json({ error: "Driver not found" });
      res.json({
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        name: driver.name,
        phone: driver.phone,
        photoUrl: driver.photoUrl,
        verificationStatus: driver.verificationStatus,
        isOnline: driver.isOnline,
        taxiqId: driver.taxiqId,
      });
    } catch (error) {
      console.error("[SESSION] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/drivers/logout", async (req: Request, res: Response) => {
    try {
      const driverId = (req.session as any)?.driverId;
      if (driverId) {
        await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
        console.log(`[AUTH] Driver logged out: ${driverId}`);
      }
      req.session.destroy((err) => {
        if (err) console.error("[AUTH] Session destroy error:", err);
        res.json({ status: "LOGGED_OUT" });
      });
    } catch (error) {
      console.error("[AUTH] Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.post("/api/drivers/register", async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, phone, referralCode } = req.body;
      if (!firstName || !lastName || !phone) {
        return res.status(400).json({ error: "Podaj imię, nazwisko i numer telefonu" });
      }
      const normalized = normalizePolishPhone(phone);
      if (!/^\+48\d{9}$/.test(normalized)) {
        return res.status(400).json({ error: "Nieprawidłowy format numeru telefonu" });
      }

      const existing = await findUserByPhone(normalized, "driver");
      if (existing) {
        return res.status(409).json({ error: "Ten numer telefonu jest już zarejestrowany jako kierowca" });
      }

      const driver = await storage.createDriver({
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone: normalized,
        referralCode: referralCode || undefined,
      });

      const result = await requestAccess(normalized, false, "driver");

      (req.session as any).authRole = "driver";
      (req.session as any).authUserId = driver.id;

      console.log(`[AUTH] Driver registered: ${maskPhone(normalized)} (id: ${driver.id})`);
      res.json({ status: result.status, driverId: driver.id });
    } catch (err: any) {
      console.error("[AUTH] Registration error:", err);
      const status = err instanceof AuthError ? err.statusCode : 500;
      res.status(status).json({ error: err.message || "Nie udało się zarejestrować" });
    }
  });

}
