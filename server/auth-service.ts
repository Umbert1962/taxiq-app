import { createHash } from "crypto";
import { storage, hashPassword, verifyPassword } from "./storage";
import { db } from "./db";
import { users, drivers, admins } from "@shared/schema";
import { eq } from "drizzle-orm";
import { normalizePolishPhone } from "./geo";
import Twilio from "twilio";

export type AuthRole = "passenger" | "driver" | "admin";

export interface AuthUser {
  id: string;
  phone: string;
  role: AuthRole;
  name: string;
  pinHash: string | null;
  pinSetAt: Date | null;
  otpHash: string | null;
  otpExpiresAt: Date | null;
  otpAttempts: number;
  pinAttempts: number;
  pinLockedUntil: Date | null;
  isBlocked?: boolean;
  blockedReason?: string | null;
  isActive?: boolean;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MS = 10 * 60 * 1000;

const otpRateLimit = new Map<string, { count: number; firstRequest: number }>();
const OTP_RATE_LIMIT_MAX = 5;
const OTP_RATE_LIMIT_WINDOW = 60 * 1000;

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}

export function checkOtpRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = otpRateLimit.get(phone);
  if (!entry || now - entry.firstRequest > OTP_RATE_LIMIT_WINDOW) {
    otpRateLimit.set(phone, { count: 1, firstRequest: now });
    return true;
  }
  if (entry.count >= OTP_RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpSms(phone: string, otpCode: string, prefix: string = "TaxiQ"): Promise<void> {
  const smsapiToken = process.env.SMSAPI_TOKEN;

  if (smsapiToken) {
    try {
      const to = phone.startsWith("+48") ? phone.slice(3) : phone.replace(/^\+/, "");
      const params = new URLSearchParams({
        to,
        message: `${prefix} - Twoj kod: ${otpCode}`,
        format: "json",
        from: "Info",
      });
      const response = await fetch("https://api.smsapi.pl/sms.do", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${smsapiToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const result = await response.json();
      if (result.error) {
        console.error(`[SMS] SMSAPI error for ${phone.slice(0,6)}****: code=${result.error} message=${result.message}`);
        console.log(`[SMS] Falling back to Twilio...`);
      } else {
        console.log(`[SMS] SMSAPI sent to ${phone.slice(0,6)}****: id=${result.list?.[0]?.id || 'unknown'} points=${result.list?.[0]?.points || 'unknown'}`);
        return;
      }
    } catch (smsapiErr: any) {
      console.error(`[SMS] SMSAPI failed, falling back to Twilio: ${smsapiErr.message}`);
    }
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!twilioSid || !twilioToken || !twilioNumber) {
    throw new Error("Usługa SMS nie jest skonfigurowana.");
  }
  const client = Twilio(twilioSid, twilioToken);
  const message = await client.messages.create({
    body: `${prefix} - Twój kod: ${otpCode}`,
    from: twilioNumber,
    to: phone,
  });
  console.log(`[SMS] Twilio sent to ${phone.slice(0,6)}****: SID=${message.sid} status=${message.status} errorCode=${message.errorCode || 'none'}`);
}

export async function findUserByPhone(phone: string, targetRole?: AuthRole): Promise<AuthUser | null> {
  const normalized = normalizePolishPhone(phone);

  if (!targetRole || targetRole === "admin") {
    const [admin] = await db.select().from(admins).where(eq(admins.phone, normalized));
    if (admin && (!targetRole || targetRole === "admin")) {
      return {
        id: admin.id,
        phone: normalized,
        role: "admin",
        name: admin.name || admin.username,
        pinHash: admin.pinHash || null,
        pinSetAt: admin.pinSetAt || null,
        otpHash: admin.otpHash || null,
        otpExpiresAt: admin.otpExpiresAt || null,
        otpAttempts: admin.otpAttempts || 0,
        pinAttempts: admin.pinAttempts || 0,
        pinLockedUntil: admin.pinLockedUntil || null,
      };
    }
  }

  if (!targetRole || targetRole === "driver") {
    const [driver] = await db.select().from(drivers).where(eq(drivers.phone, normalized));
    if (driver) {
      return {
        id: driver.id,
        phone: normalized,
        role: "driver",
        name: driver.name || `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
        pinHash: driver.pinHash || null,
        pinSetAt: driver.pinSetAt || null,
        otpHash: driver.otpHash || null,
        otpExpiresAt: driver.otpExpiresAt || null,
        otpAttempts: driver.otpAttempts || 0,
        pinAttempts: driver.pinAttempts || 0,
        pinLockedUntil: driver.pinLockedUntil || null,
        isBlocked: driver.isBlocked || false,
        blockedReason: driver.blockedReason || null,
        isActive: driver.isActive !== false,
      };
    }
  }

  if (!targetRole || targetRole === "passenger") {
    const [user] = await db.select().from(users).where(eq(users.phone, normalized));
    if (user) {
      return {
        id: user.id,
        phone: normalized,
        role: "passenger",
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
        pinHash: user.pinHash || null,
        pinSetAt: user.pinSetAt || null,
        otpHash: user.otpCode || null,
        otpExpiresAt: user.otpExpiresAt || null,
        otpAttempts: user.otpAttempts || 0,
        pinAttempts: user.pinAttempts || 0,
        pinLockedUntil: user.pinLockedUntil || null,
        isBlocked: user.isBlocked || false,
        blockedReason: user.blockedReason || null,
        isActive: user.isActive !== false,
      };
    }
  }

  return null;
}

export async function isPhoneGloballyUnique(phone: string, excludeRole?: AuthRole, excludeId?: string): Promise<boolean> {
  const normalized = normalizePolishPhone(phone);

  const [adminResult] = await db.select({ id: admins.id }).from(admins).where(eq(admins.phone, normalized));
  if (adminResult && !(excludeRole === "admin" && excludeId === adminResult.id)) return false;

  const [driverResult] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.phone, normalized));
  if (driverResult && !(excludeRole === "driver" && excludeId === driverResult.id)) return false;

  const [userResult] = await db.select({ id: users.id }).from(users).where(eq(users.phone, normalized));
  if (userResult && !(excludeRole === "passenger" && excludeId === userResult.id)) return false;

  return true;
}

async function updateOtpFields(role: AuthRole, id: string, otpHash: string, otpExpiresAt: Date): Promise<void> {
  switch (role) {
    case "admin":
      await db.update(admins).set({ otpHash, otpExpiresAt, otpAttempts: 0 }).where(eq(admins.id, id));
      break;
    case "driver":
      await db.update(drivers).set({ otpHash, otpExpiresAt, otpAttempts: 0 }).where(eq(drivers.id, id));
      break;
    case "passenger":
      await db.update(users).set({ otpCode: otpHash, otpExpiresAt, otpAttempts: 0 }).where(eq(users.id, id));
      break;
  }
}

async function clearOtpFields(role: AuthRole, id: string): Promise<void> {
  switch (role) {
    case "admin":
      await db.update(admins).set({ otpHash: null, otpExpiresAt: null, otpAttempts: 0 }).where(eq(admins.id, id));
      break;
    case "driver":
      await db.update(drivers).set({ otpHash: null, otpExpiresAt: null, otpAttempts: 0 }).where(eq(drivers.id, id));
      break;
    case "passenger":
      await db.update(users).set({ otpCode: null, otpExpiresAt: null, otpAttempts: 0 }).where(eq(users.id, id));
      break;
  }
}

async function incrementOtpAttempts(role: AuthRole, id: string, current: number): Promise<void> {
  const val = current + 1;
  switch (role) {
    case "admin":
      await db.update(admins).set({ otpAttempts: val }).where(eq(admins.id, id));
      break;
    case "driver":
      await db.update(drivers).set({ otpAttempts: val }).where(eq(drivers.id, id));
      break;
    case "passenger":
      await db.update(users).set({ otpAttempts: val }).where(eq(users.id, id));
      break;
  }
}

async function setPinFields(role: AuthRole, id: string, pinHash: string): Promise<void> {
  const data = { pinHash, pinSetAt: new Date(), pinAttempts: 0, pinLockedUntil: null as Date | null };
  switch (role) {
    case "admin":
      await db.update(admins).set({ ...data, otpHash: null, otpExpiresAt: null, otpAttempts: 0 }).where(eq(admins.id, id));
      break;
    case "driver":
      await db.update(drivers).set({ ...data, otpHash: null, otpExpiresAt: null, otpAttempts: 0 }).where(eq(drivers.id, id));
      break;
    case "passenger":
      await db.update(users).set({ ...data, otpCode: null, otpExpiresAt: null, otpAttempts: 0 }).where(eq(users.id, id));
      break;
  }
}

async function updatePinAttempts(role: AuthRole, id: string, attempts: number, lockedUntil: Date | null): Promise<void> {
  const data: any = { pinAttempts: attempts };
  if (lockedUntil) data.pinLockedUntil = lockedUntil;
  switch (role) {
    case "admin":
      await db.update(admins).set(data).where(eq(admins.id, id));
      break;
    case "driver":
      await db.update(drivers).set(data).where(eq(drivers.id, id));
      break;
    case "passenger":
      await db.update(users).set(data).where(eq(users.id, id));
      break;
  }
}

async function resetPinAttempts(role: AuthRole, id: string): Promise<void> {
  const data = { pinAttempts: 0, pinLockedUntil: null as Date | null };
  switch (role) {
    case "admin":
      await db.update(admins).set(data).where(eq(admins.id, id));
      break;
    case "driver":
      await db.update(drivers).set(data).where(eq(drivers.id, id));
      break;
    case "passenger":
      await db.update(users).set(data).where(eq(users.id, id));
      break;
  }
}

async function clearPinForReset(role: AuthRole, id: string): Promise<void> {
  const data = { pinHash: null as string | null, pinSetAt: null as Date | null, pinAttempts: 0, pinLockedUntil: null as Date | null };
  switch (role) {
    case "admin":
      await db.update(admins).set(data).where(eq(admins.id, id));
      break;
    case "driver":
      await db.update(drivers).set(data).where(eq(drivers.id, id));
      break;
    case "passenger":
      await db.update(users).set(data).where(eq(users.id, id));
      break;
  }
}

export interface RequestAccessResult {
  status: "PIN_REQUIRED" | "OTP_SENT";
  role: AuthRole;
  userId: string;
}

export async function requestAccess(phone: string, allowPassengerCreation: boolean = false, targetRole?: AuthRole): Promise<RequestAccessResult> {
  const normalized = normalizePolishPhone(phone);
  if (!/^\+48\d{9}$/.test(normalized)) {
    throw new AuthError("Nieprawidłowy format numeru telefonu", 400);
  }

  let authUser = await findUserByPhone(normalized, targetRole);

  if (!authUser && allowPassengerCreation) {
    const newUser = await storage.createUser({
      username: normalized,
      phone: normalized,
    });
    authUser = {
      id: newUser.id,
      phone: normalized,
      role: "passenger",
      name: normalized,
      pinHash: null,
      pinSetAt: null,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      pinAttempts: 0,
      pinLockedUntil: null,
      isBlocked: false,
      blockedReason: null,
    };
    console.log(`[AUTH] Auto-created passenger account for ${maskPhone(normalized)}`);
  }

  if (!authUser) {
    throw new AuthError("Nie znaleziono konta z tym numerem telefonu", 404);
  }

  if (authUser.isActive === false) {
    if (authUser.role === "driver") {
      await db.update(drivers).set({
        isActive: true,
        deletedAt: null,
        deactivationReason: null,
        deactivatedBy: null,
      }).where(eq(drivers.id, authUser.id));
    } else if (authUser.role === "passenger") {
      await db.update(users).set({
        isActive: true,
        deletedAt: null,
        deactivationReason: null,
        deactivatedBy: null,
      }).where(eq(users.id, authUser.id));
    }
    authUser.isActive = true;
    console.log(`[AUTH] Reactivated ${authUser.role} account: ${maskPhone(normalized)} (id: ${authUser.id})`);
  }

  if (authUser.isBlocked) {
    throw new AuthError(authUser.blockedReason || "Konto zablokowane", 403);
  }

  if (authUser.pinHash) {
    return { status: "PIN_REQUIRED", role: authUser.role, userId: authUser.id };
  }

  if (!checkOtpRateLimit(normalized)) {
    throw new AuthError("Zbyt wiele prób. Spróbuj za minutę.", 429);
  }

  const otpCode = generateOtp();
  const hashed = hashOtp(otpCode);
  await updateOtpFields(authUser.role, authUser.id, hashed, new Date(Date.now() + OTP_EXPIRY_MS));

  const roleLabel = authUser.role === "admin" ? "Admin" : authUser.role === "driver" ? "Kierowca" : "TaxiQ";
  try {
    await sendOtpSms(normalized, otpCode, `TaxiQ ${roleLabel}`);
  } catch (smsErr: any) {
    console.error(`[AUTH] SMS send failed for ${maskPhone(normalized)}: ${smsErr?.message}`);
    throw new AuthError("Nie udało się wysłać SMS z kodem. Sprawdź numer telefonu.", 500);
  }

  return { status: "OTP_SENT", role: authUser.role, userId: authUser.id };
}

export interface VerifyOtpResult {
  status: "SET_PIN_REQUIRED";
  role: AuthRole;
  userId: string;
}

export async function verifyOtp(phone: string, otp: string, targetRole?: AuthRole): Promise<VerifyOtpResult> {
  const normalized = normalizePolishPhone(phone);
  const authUser = await findUserByPhone(normalized, targetRole);
  if (!authUser) throw new AuthError("Nie znaleziono konta", 404);

  if (!authUser.otpHash || !authUser.otpExpiresAt) {
    throw new AuthError("Nie wysłano kodu OTP", 400);
  }

  if (new Date() > new Date(authUser.otpExpiresAt)) {
    throw new AuthError("Kod OTP wygasł. Poproś o nowy.", 400);
  }

  if (authUser.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AuthError("Przekroczono liczbę prób. Poproś o nowy kod.", 429);
  }

  const inputHash = hashOtp(otp);
  if (inputHash !== authUser.otpHash) {
    await incrementOtpAttempts(authUser.role, authUser.id, authUser.otpAttempts);
    throw new AuthError("Nieprawidłowy kod OTP", 401);
  }

  await clearOtpFields(authUser.role, authUser.id);
  return { status: "SET_PIN_REQUIRED", role: authUser.role, userId: authUser.id };
}

export interface SetPinResult {
  status: "PIN_SET";
  role: AuthRole;
  userId: string;
  name: string;
}

export async function setPin(phone: string, pin: string, verifiedUserId: string, targetRole?: AuthRole): Promise<SetPinResult> {
  if (!/^\d{6}$/.test(pin)) {
    throw new AuthError("PIN musi mieć dokładnie 6 cyfr", 400);
  }

  const normalized = normalizePolishPhone(phone);
  const authUser = await findUserByPhone(normalized, targetRole);
  if (!authUser) throw new AuthError("Nie znaleziono konta", 404);

  if (verifiedUserId !== authUser.id) {
    throw new AuthError("Najpierw zweryfikuj kod OTP", 403);
  }

  const pinHashed = await hashPassword(pin);
  await setPinFields(authUser.role, authUser.id, pinHashed);

  return { status: "PIN_SET", role: authUser.role, userId: authUser.id, name: authUser.name };
}

export interface LoginPinResult {
  role: AuthRole;
  userId: string;
  name: string;
}

export async function loginWithPin(phone: string, pin: string, targetRole?: AuthRole): Promise<LoginPinResult> {
  const normalized = normalizePolishPhone(phone);
  const authUser = await findUserByPhone(normalized, targetRole);

  if (!authUser) {
    throw new AuthError("Nieprawidłowy numer lub PIN", 401);
  }

  if (authUser.isActive === false) {
    throw new AuthError("Konto zostało dezaktywowane przez administratora", 403);
  }

  if (authUser.isBlocked) {
    throw new AuthError(authUser.blockedReason || "Konto zablokowane", 403);
  }

  if (!authUser.pinHash) {
    throw new AuthError("PIN nie został ustawiony. Użyj kodu SMS.", 400);
  }

  if (authUser.pinLockedUntil && new Date() < new Date(authUser.pinLockedUntil)) {
    const remainingMs = new Date(authUser.pinLockedUntil).getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AuthError(`Konto zablokowane. Spróbuj za ${remainingMin} min.`, 429);
  }

  const pinValid = await verifyPassword(pin, authUser.pinHash);
  if (!pinValid) {
    const newAttempts = authUser.pinAttempts + 1;
    const lockedUntil = newAttempts >= MAX_PIN_ATTEMPTS ? new Date(Date.now() + PIN_LOCK_MS) : null;
    await updatePinAttempts(authUser.role, authUser.id, newAttempts, lockedUntil);
    throw new AuthError("Nieprawidłowy numer lub PIN", 401);
  }

  await resetPinAttempts(authUser.role, authUser.id);
  return { role: authUser.role, userId: authUser.id, name: authUser.name };
}

export async function forgotPin(phone: string, targetRole?: AuthRole): Promise<{ status: "OTP_SENT"; role: AuthRole; userId: string }> {
  const normalized = normalizePolishPhone(phone);
  const authUser = await findUserByPhone(normalized, targetRole);
  if (!authUser) throw new AuthError("Nie znaleziono konta z tym numerem", 404);

  if (!checkOtpRateLimit(normalized)) {
    throw new AuthError("Zbyt wiele prób. Spróbuj za minutę.", 429);
  }

  const otpCode = generateOtp();
  const hashed = hashOtp(otpCode);

  await clearPinForReset(authUser.role, authUser.id);
  await updateOtpFields(authUser.role, authUser.id, hashed, new Date(Date.now() + OTP_EXPIRY_MS));

  const roleLabel = authUser.role === "admin" ? "Admin" : authUser.role === "driver" ? "Kierowca" : "TaxiQ";
  try {
    await sendOtpSms(normalized, otpCode, `TaxiQ ${roleLabel}`);
  } catch (smsErr: any) {
    console.error(`[AUTH] Forgot-PIN SMS failed for ${maskPhone(normalized)}: ${smsErr?.message}`);
    throw new AuthError("Nie udało się wysłać SMS. Sprawdź numer telefonu.", 500);
  }

  return { status: "OTP_SENT", role: authUser.role, userId: authUser.id };
}

export async function invalidateSessionsByRole(role: AuthRole, userId: string): Promise<void> {
  switch (role) {
    case "admin":
      await storage.invalidateAdminSessions(userId);
      break;
    case "driver":
      await storage.invalidateDriverSessions(userId);
      break;
    case "passenger":
      await storage.invalidatePassengerSessions(userId);
      break;
  }
}

export async function hasActiveSessionByRole(role: AuthRole, userId: string): Promise<boolean> {
  switch (role) {
    case "admin":
      return storage.hasActiveAdminSession(userId);
    case "driver":
      return storage.hasActiveDriverSession(userId);
    case "passenger":
      return storage.hasActivePassengerSession(userId);
    default:
      return false;
  }
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}
