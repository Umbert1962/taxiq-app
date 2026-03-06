import { 
  users, drivers, rides, messages, ratings, pushSubscriptions,
  companies, employees, businessRides, invoices, invoiceItems,
  passwordResetTokens, admins, session,
  fcmTokens, corporateMemberships,
  type User, type InsertUser, 
  type Driver, type InsertDriver,
  type Ride, type InsertRide,
  type Message, type InsertMessage,
  type Rating, type InsertRating,
  type Company, type InsertCompany,
  type Employee, type InsertEmployee,
  type BusinessRide, type InsertBusinessRide,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type PushSubscription, type InsertPushSubscription,
  type FcmToken, type InsertFcmToken,
  type PasswordResetToken,
  type Admin, type InsertAdmin,
  type Promotion, promotions,
  type CorporateMembership,
  homeContent,
  referrals, type Referral,
  referralPayouts, type ReferralPayout,
  rideStatusLog, validStatusTransitions,
  favoriteDrivers, type FavoriteDriver,
  systemMessages, type SystemMessage,
  userMessageReads, type UserMessageRead
} from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, or, not, between, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  setUserOnline(id: string, isOnline: boolean): Promise<User | undefined>;
  getOnlineUsers(): Promise<User[]>;
  
  // Drivers
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByUsername(username: string): Promise<Driver | undefined>;
  getDriverByTaxiqId(taxiqId: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriverOnlineStatus(id: string, isOnline: boolean): Promise<Driver | undefined>;
  updateDriverGpsLocation(id: string, lat: number, lng: number): Promise<Driver | undefined>;
  updateDriverStats(id: string, earnings: number): Promise<Driver | undefined>;
  getOnlineDrivers(): Promise<Driver[]>;
  updateDriverLanguages(id: string, languages: string[]): Promise<Driver | undefined>;
  updateDriverPricing(id: string, pricing: {
    baseFare: number;
    rateDayCity: number;
    rateDaySuburb: number;
    rateNightCity: number;
    rateNightSuburb: number;
    rateHolidayCity: number;
    rateHolidaySuburb: number;
    rateCito: number;
    rateWaitingPerMinute: number;
    suburbRadiusKm: number;
    discountPercent: number;
  }): Promise<Driver | undefined>;
  suspendDriverSubscription(id: string, returnDate: Date): Promise<Driver | undefined>;
  resumeDriverSubscription(id: string): Promise<Driver | undefined>;
  getDriverSubscriptionInfo(id: string): Promise<Driver | undefined>;
  
  // Rides
  createRide(ride: InsertRide): Promise<Ride>;
  getRide(id: string): Promise<Ride | undefined>;
  getRideWithDriver(id: string): Promise<(Ride & { driver: Driver | null }) | undefined>;
  getAllRides(): Promise<Ride[]>;
  getAllRidesWithDrivers(): Promise<(Ride & { driver: Driver | null })[]>;
  getPendingRides(): Promise<Ride[]>;
  getDriverRides(driverId: string): Promise<Ride[]>;
  getPassengerRides(passengerId: string): Promise<Ride[]>;
  getPassengerRidesWithDrivers(passengerId: string): Promise<(Ride & { driver: Driver | null })[]>;
  logStatusTransition(rideId: string, oldStatus: string, newStatus: string, actor: string, actorId?: string): Promise<void>;
  updateRideStatus(id: string, status: string, actor?: string, actorId?: string): Promise<Ride | undefined>;
  updateRide(id: string, data: Partial<Ride>): Promise<Ride | undefined>;
  assignDriver(rideId: string, driverId: string): Promise<{ ride?: Ride; alreadyTaken?: boolean }>;
  cancelRide(id: string, actor?: string, actorId?: string, cancelStatus?: string): Promise<Ride | undefined>;
  completeRide(id: string, finalPrice: number, actorId?: string): Promise<Ride | undefined>;
  setNegotiatedPrice(id: string, negotiatedPrice: number): Promise<Ride | undefined>;
  updateRideDestination(id: string, destination: string, destLat: string, destLng: string, additionalPrice: number): Promise<Ride | undefined>;
  updateDriverLocation(rideId: string, lat: string, lng: string): Promise<Ride | undefined>;
  updatePassengerLocation(rideId: string, lat: string, lng: string): Promise<Ride | undefined>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getRideMessages(rideId: string): Promise<Message[]>;
  markMessagesAsRead(rideId: string, recipientType: string): Promise<void>;
  getUnreadMessageCount(rideId: string, recipientType: string): Promise<number>;
  
  // Ratings
  createRating(rating: InsertRating): Promise<Rating>;
  getDriverRatings(driverId: string): Promise<Rating[]>;
  getRideRating(rideId: string): Promise<Rating | undefined>;
  
  // Push subscriptions
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getDriverPushSubscriptions(driverId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  
  // FCM tokens
  saveFcmToken(token: InsertFcmToken): Promise<FcmToken>;
  getFcmTokensByUserId(userId: string, userType: string): Promise<FcmToken[]>;
  deleteFcmToken(token: string): Promise<void>;
  
  // Admins
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByPhone(phone: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: string, data: Partial<Admin>): Promise<Admin | undefined>;
  countAdmins(): Promise<number>;
  deleteAdmin(id: string): Promise<void>;
  getAllAdmins(): Promise<Admin[]>;
  getAllUsers(): Promise<User[]>;
  getAllDrivers(): Promise<Driver[]>;
  getEligibleDriversCandidates(
    centerLat: number,
    centerLng: number,
    maxDistanceKm: number,
    excludeDriverIds: string[],
    limit: number
  ): Promise<Driver[]>;
  getAllCompanies(): Promise<Company[]>;
  deleteUser(id: string): Promise<void>;
  deleteDriver(id: string): Promise<void>;
  updateDriver(id: string, data: Partial<InsertDriver>): Promise<Driver | undefined>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<void>;
  setCompanyOnline(id: string, isOnline: boolean): Promise<Company | undefined>;
  setEmployeeOnline(id: string, isOnline: boolean): Promise<Employee | undefined>;

  // Corporate memberships
  getActiveCorporateMembership(userId: string): Promise<CorporateMembership | null>;
  
  // Promotions
  getActivePromotions(): Promise<Promotion[]>;

  // Home content
  getHomeContent(): Promise<{ heroVideoUrl: string; heroHeadline: string; liveMessage: string }>;

  // Loyalty / Referral discount system
  getCompletedRideCountBetween(passengerId: string, driverId: string): Promise<number>;
  getPassengerReferralStatus(passengerId: string): Promise<{ eligible: boolean; expirationDate: Date | null; referrerDriverId: string | null }>;
  checkAndGrantReferralEligibility(passengerId: string): Promise<boolean>;
  applyReferralDiscount(rideId: string, passengerId: string, driverId: string): Promise<{ success: boolean; error?: string }>;
  getDriverLoyaltyBudget(driverId: string): Promise<number>;

  // Favorite drivers
  getFavoriteDriverIds(passengerId: string): Promise<string[]>;
  addFavoriteDriver(passengerId: string, driverId: string): Promise<FavoriteDriver>;
  removeFavoriteDriver(passengerId: string, driverId: string): Promise<void>;
  getFavoriteDrivers(passengerId: string): Promise<FavoriteDriver[]>;
  getDriverByLicenseNumber(licenseNumber: string): Promise<Driver | undefined>;

  // System messages
  createSystemMessage(data: Partial<SystemMessage>): Promise<SystemMessage>;
  getSystemMessages(): Promise<SystemMessage[]>;
  getSystemMessage(id: string): Promise<SystemMessage | undefined>;
  deactivateSystemMessage(id: string): Promise<void>;
  getActiveMessagesForRole(role: string): Promise<SystemMessage[]>;
  getPendingRequiredMessages(userId: string, role: string): Promise<SystemMessage[]>;
  markMessageRead(userId: string, userRole: string, messageId: string): Promise<UserMessageRead>;
  acknowledgeMessage(userId: string, messageId: string): Promise<UserMessageRead | undefined>;
  getMessageReadStats(messageId: string): Promise<{ totalRead: number; totalAcknowledged: number }>;
  getUnreadSystemMessageCount(userId: string, role: string): Promise<number>;
  getUserMessageReadStatus(userId: string, messageIds: string[]): Promise<UserMessageRead[]>;

  // Session management - single session enforcement
  invalidateDriverSessions(driverId: string): Promise<void>;
  invalidatePassengerSessions(passengerId: string): Promise<void>;
  invalidateAdminSessions(adminId: string): Promise<void>;
  hasActiveDriverSession(driverId: string): Promise<boolean>;
  hasActivePassengerSession(passengerId: string): Promise<boolean>;
  hasActiveAdminSession(adminId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
    }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async setUserOnline(id: string, isOnline: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isOnline })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getOnlineUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isOnline, true));
  }

  // Drivers
  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async getDriverByUsername(username: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.username, username));
    return driver || undefined;
  }

  async getDriverByTaxiqId(taxiqId: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.taxiqId, taxiqId));
    return driver || undefined;
  }

  async generateUniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = `TQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const [existing] = await db.select().from(drivers).where(eq(drivers.referralCode, code));
      if (!existing) return code;
    }
    return `TQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  async generateUniqueTaxiqId(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const bytes = crypto.randomBytes(4);
      const code = bytes.readUInt32BE(0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
      const taxiqId = `TXQ-${code}`;
      const [existing] = await db.select().from(drivers).where(eq(drivers.taxiqId, taxiqId));
      if (!existing) return taxiqId;
    }
    const fallback = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 6);
    return `TXQ-${fallback}`;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
    const referralCode = await this.generateUniqueReferralCode();
    const taxiqId = await this.generateUniqueTaxiqId();
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const plainPassword = Math.floor(100000 + Math.random() * 900000).toString();
    
    const [driver] = await db.insert(drivers).values({
      ...insertDriver,
      password: tempPassword,
      plainPassword,
      subscriptionStatus: "trial",
      trialEndsAt,
      referralCode,
      taxiqId,
      verificationStatus: "UNVERIFIED",
    }).returning();
    return driver;
  }

  async updateDriverOnlineStatus(id: string, isOnline: boolean): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set({ isOnline })
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async updateDriverGpsLocation(id: string, lat: number, lng: number): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set({ 
        currentLat: String(lat),
        currentLng: String(lng),
        lastLocationUpdate: new Date()
      })
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async updateDriverStats(id: string, earnings: number): Promise<Driver | undefined> {
    const driver = await this.getDriver(id);
    if (!driver) return undefined;
    
    const [updated] = await db
      .update(drivers)
      .set({ 
        totalRides: (driver.totalRides || 0) + 1,
        totalEarnings: (driver.totalEarnings || 0) + earnings
      })
      .where(eq(drivers.id, id))
      .returning();
    return updated || undefined;
  }

  async getOnlineDrivers(): Promise<Driver[]> {
    return db.select().from(drivers).where(
      and(
        eq(drivers.isOnline, true),
        eq(drivers.verificationStatus, "approved"),
        eq(drivers.isActive, true),
      )
    );
  }

  async updateDriverLanguages(id: string, languages: string[]): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set({ languages })
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async updateDriverPricing(id: string, pricing: {
    baseFare: number;
    rateDayCity: number;
    rateDaySuburb: number;
    rateNightCity: number;
    rateNightSuburb: number;
    rateHolidayCity: number;
    rateHolidaySuburb: number;
    rateCito: number;
    rateWaitingPerMinute: number;
    suburbRadiusKm: number;
    discountPercent: number;
  }): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set(pricing)
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async suspendDriverSubscription(id: string, returnDate: Date): Promise<Driver | undefined> {
    const driver = await this.getDriver(id);
    if (!driver) return undefined;
    
    // Calculate remaining days based on current subscription
    const now = new Date();
    let remainingDays = 0;
    
    if (driver.subscriptionStatus === "trial" && driver.trialEndsAt) {
      remainingDays = Math.max(0, Math.ceil((driver.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (driver.subscriptionStatus === "active" && driver.subscriptionEndsAt) {
      remainingDays = Math.max(0, Math.ceil((driver.subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    const [updated] = await db
      .update(drivers)
      .set({
        subscriptionStatus: "suspended",
        suspendedAt: now,
        suspendedUntil: returnDate,
        remainingDays,
        isOnline: false, // Go offline when suspended
      })
      .where(eq(drivers.id, id))
      .returning();
    return updated || undefined;
  }

  async resumeDriverSubscription(id: string): Promise<Driver | undefined> {
    const driver = await this.getDriver(id);
    if (!driver || driver.subscriptionStatus !== "suspended") return undefined;
    
    const now = new Date();
    const remainingDays = driver.remainingDays || 0;
    
    // Restore the subscription with remaining days
    let newStatus: string;
    let trialEndsAt: Date | null = null;
    let subscriptionEndsAt: Date | null = null;
    
    if (remainingDays > 0) {
      // Check if was in trial or active
      if (driver.trialEndsAt && !driver.subscriptionEndsAt) {
        newStatus = "trial";
        trialEndsAt = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);
      } else {
        newStatus = "active";
        subscriptionEndsAt = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);
      }
    } else {
      newStatus = "expired";
    }
    
    const [updated] = await db
      .update(drivers)
      .set({
        subscriptionStatus: newStatus,
        suspendedAt: null,
        suspendedUntil: null,
        remainingDays: 0,
        trialEndsAt,
        subscriptionEndsAt,
      })
      .where(eq(drivers.id, id))
      .returning();
    return updated || undefined;
  }

  async getDriverSubscriptionInfo(id: string): Promise<Driver | undefined> {
    return this.getDriver(id);
  }

  // Rides
  async createRide(insertRide: InsertRide): Promise<Ride> {
    // Use provided estimatedPrice from frontend (driver-specific) or calculate fallback
    let estimatedPrice = insertRide.estimatedPrice || 20;
    
    // If no price provided, calculate distance-based price using Haversine formula
    if (!insertRide.estimatedPrice && insertRide.pickupLat && insertRide.pickupLng && insertRide.destLat && insertRide.destLng) {
      const pickupLat = parseFloat(insertRide.pickupLat);
      const pickupLng = parseFloat(insertRide.pickupLng);
      const destLat = parseFloat(insertRide.destLat);
      const destLng = parseFloat(insertRide.destLng);
      
      if (!isNaN(pickupLat) && !isNaN(pickupLng) && !isNaN(destLat) && !isNaN(destLng)) {
        // Haversine formula to calculate distance in km
        const R = 6371; // Earth radius in km
        const dLat = (destLat - pickupLat) * Math.PI / 180;
        const dLng = (destLng - pickupLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pickupLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceKm = R * c;
        
        // Pricing: 8 PLN base + 3 PLN per km (road distance is ~1.3x straight line)
        const roadDistanceKm = distanceKm * 1.3;
        const baseFare = 8;
        const ratePerKm = 3;
        estimatedPrice = Math.round(baseFare + (roadDistanceKm * ratePerKm));
        
        // Minimum price 20 PLN
        if (estimatedPrice < 20) {
          estimatedPrice = 20;
        }
      }
    }
    
    // Apply CITO surcharge (+50%) only if not already using custom price
    if (insertRide.isCito && !insertRide.estimatedPrice) {
      estimatedPrice = Math.round(estimatedPrice * 1.5);
    }
    
    const [ride] = await db
      .insert(rides)
      .values({ ...insertRide, estimatedPrice })
      .returning();
    return ride;
  }

  async getRide(id: string): Promise<Ride | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride || undefined;
  }

  async getRideWithDriver(id: string): Promise<(Ride & { driver: Driver | null }) | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    if (!ride) return undefined;
    
    let driver: Driver | null = null;
    if (ride.driverId) {
      const [d] = await db.select().from(drivers).where(eq(drivers.id, ride.driverId));
      driver = d || null;
    }
    return { ...ride, driver };
  }

  async getAllRides(): Promise<Ride[]> {
    return db.select().from(rides).orderBy(desc(rides.createdAt));
  }

  async getAllRidesWithDrivers(): Promise<(Ride & { driver: Driver | null })[]> {
    const allRides = await db.select().from(rides).orderBy(desc(rides.createdAt));
    
    // Get all unique driver IDs
    const driverIdsSet = new Set<string>();
    allRides.filter(r => r.driverId).forEach(r => driverIdsSet.add(r.driverId!));
    const driverIds = Array.from(driverIdsSet);
    
    // Fetch all drivers at once
    const driversMap = new Map<string, Driver>();
    if (driverIds.length > 0) {
      const allDrivers = await db.select().from(drivers).where(
        driverIds.length === 1 
          ? eq(drivers.id, driverIds[0])
          : sql`${drivers.id} IN (${sql.join(driverIds.map(id => sql`${id}`), sql`, `)})`
      );
      allDrivers.forEach(d => driversMap.set(d.id, d));
    }
    
    // Map rides with their drivers
    return allRides.map(ride => ({
      ...ride,
      driver: ride.driverId ? driversMap.get(ride.driverId) || null : null
    }));
  }

  async getPendingRides(): Promise<Ride[]> {
    // Sortowanie: CITO najpierw (priorytet), potem według daty utworzenia
    return db.select().from(rides)
      .where(eq(rides.status, "pending"))
      .orderBy(desc(rides.isCito), desc(rides.createdAt));
  }

  async getDriverRides(driverId: string): Promise<Ride[]> {
    return db.select().from(rides).where(eq(rides.driverId, driverId)).orderBy(desc(rides.createdAt));
  }

  async getPassengerRides(passengerId: string): Promise<Ride[]> {
    return db.select().from(rides).where(eq(rides.passengerId, passengerId)).orderBy(desc(rides.createdAt));
  }

  async getPassengerRidesWithDrivers(passengerId: string): Promise<(Ride & { driver: Driver | null })[]> {
    const passengerRides = await db.select().from(rides).where(eq(rides.passengerId, passengerId)).orderBy(desc(rides.createdAt));
    
    const driverIdsSet = new Set<string>();
    passengerRides.filter(r => r.driverId).forEach(r => driverIdsSet.add(r.driverId!));
    const driverIds = Array.from(driverIdsSet);
    
    const driversMap = new Map<string, Driver>();
    if (driverIds.length > 0) {
      const allDrivers = await db.select().from(drivers).where(
        driverIds.length === 1 
          ? eq(drivers.id, driverIds[0])
          : sql`${drivers.id} IN (${sql.join(driverIds.map(id => sql`${id}`), sql`, `)})`
      );
      allDrivers.forEach(d => driversMap.set(d.id, d));
    }
    
    return passengerRides.map(ride => ({
      ...ride,
      driver: ride.driverId ? driversMap.get(ride.driverId) || null : null
    }));
  }

  async logStatusTransition(rideId: string, oldStatus: string, newStatus: string, actor: string, actorId?: string): Promise<void> {
    await db.insert(rideStatusLog).values({
      rideId,
      oldStatus,
      newStatus,
      actor,
      actorId: actorId || null,
    });
    console.log(`[RIDE STATUS] ${rideId}: ${oldStatus} → ${newStatus} (by ${actor}${actorId ? ` #${actorId}` : ''})`);
  }

  async updateRideStatus(id: string, status: string, actor: string = "system", actorId?: string): Promise<Ride | undefined> {
    const existingRide = await this.getRide(id);
    if (!existingRide) return undefined;

    const allowed = validStatusTransitions[existingRide.status];
    if (allowed && !allowed.includes(status)) {
      console.warn(`[RIDE STATUS] BLOCKED: ${existingRide.status} → ${status} is not a valid transition for ride ${id}`);
      return existingRide;
    }

    const timestamps: Record<string, Date> = {};
    if (status === "accepted") timestamps.acceptedAt = new Date();
    if (status === "in_progress") timestamps.startedAt = new Date();
    if (status === "completed") timestamps.completedAt = new Date();

    const [ride] = await db
      .update(rides)
      .set({ status, ...timestamps })
      .where(eq(rides.id, id))
      .returning();

    if (ride) {
      await this.logStatusTransition(id, existingRide.status, status, actor, actorId);
    }

    return ride || undefined;
  }

  async updateRide(id: string, data: Partial<Ride>): Promise<Ride | undefined> {
    const [ride] = await db
      .update(rides)
      .set(data)
      .where(eq(rides.id, id))
      .returning();
    return ride || undefined;
  }

  async assignDriver(rideId: string, driverId: string): Promise<{ ride?: Ride; alreadyTaken?: boolean }> {
    const existingRide = await this.getRide(rideId);
    if (!existingRide) return {};

    const oldStatus = existingRide.status;
    const allowed = validStatusTransitions[oldStatus];
    if (allowed && !allowed.includes("accepted")) {
      console.warn(`[RIDE STATUS] BLOCKED assignDriver: ${oldStatus} → accepted is not a valid transition for ride ${rideId}`);
      return { alreadyTaken: true };
    }

    const result = await db
      .update(rides)
      .set({ driverId, status: "accepted", acceptedAt: new Date() })
      .where(and(eq(rides.id, rideId), eq(rides.status, "pending")))
      .returning();

    if (result.length === 0) {
      return { alreadyTaken: true };
    }

    await this.logStatusTransition(rideId, oldStatus, "accepted", "driver", driverId);
    return { ride: result[0] };
  }

  async cancelRide(id: string, actor: string = "system", actorId?: string, cancelStatus: string = "cancelled"): Promise<Ride | undefined> {
    const ride = await this.getRide(id);
    if (!ride || ride.status === "completed" || ride.status === "cancelled" || ride.status === "cancelled_by_passenger" || ride.status === "cancelled_by_driver") {
      return ride;
    }

    const oldStatus = ride.status;
    const [updated] = await db
      .update(rides)
      .set({ status: cancelStatus })
      .where(eq(rides.id, id))
      .returning();

    if (updated) {
      await this.logStatusTransition(id, oldStatus, cancelStatus, actor, actorId);
    }

    return updated || undefined;
  }

  async completeRide(id: string, finalPrice: number, actorId?: string): Promise<Ride | undefined> {
    const existingRide = await this.getRide(id);
    const oldStatus = existingRide?.status || "unknown";

    const [ride] = await db
      .update(rides)
      .set({ status: "completed", finalPrice, completedAt: new Date() })
      .where(eq(rides.id, id))
      .returning();
    
    if (ride) {
      await this.logStatusTransition(id, oldStatus, "completed", "driver", actorId);
      if (ride.driverId) {
        await this.updateDriverStats(ride.driverId, finalPrice);
      }
      // DISABLED: Passenger referral discount system (kept for future use)
      // if (ride.passengerId) {
      //   await this.checkAndGrantReferralEligibility(ride.passengerId);
      // }
    }
    
    return ride || undefined;
  }

  async setNegotiatedPrice(id: string, negotiatedPrice: number): Promise<Ride | undefined> {
    const [ride] = await db
      .update(rides)
      .set({ negotiatedPrice })
      .where(eq(rides.id, id))
      .returning();
    return ride || undefined;
  }

  async updateRideDestination(id: string, destination: string, destLat: string, destLng: string, additionalPrice: number): Promise<Ride | undefined> {
    const existingRide = await this.getRide(id);
    if (!existingRide) return undefined;
    
    const newEstimatedPrice = (existingRide.estimatedPrice || 0) + additionalPrice;
    
    const [ride] = await db
      .update(rides)
      .set({ 
        destination, 
        destLat, 
        destLng,
        estimatedPrice: newEstimatedPrice
      })
      .where(eq(rides.id, id))
      .returning();
    return ride || undefined;
  }

  async updateDriverLocation(rideId: string, lat: string, lng: string): Promise<Ride | undefined> {
    const [ride] = await db
      .update(rides)
      .set({
        driverCurrentLat: lat,
        driverCurrentLng: lng,
        driverLocationUpdatedAt: new Date(),
      })
      .where(eq(rides.id, rideId))
      .returning();
    return ride || undefined;
  }

  async updatePassengerLocation(rideId: string, lat: string, lng: string): Promise<Ride | undefined> {
    const [ride] = await db
      .update(rides)
      .set({
        passengerCurrentLat: lat,
        passengerCurrentLng: lng,
        passengerLocationUpdatedAt: new Date(),
      })
      .where(eq(rides.id, rideId))
      .returning();
    return ride || undefined;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getRideMessages(rideId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.rideId, rideId)).orderBy(messages.createdAt);
  }

  async markMessagesAsRead(rideId: string, recipientType: string): Promise<void> {
    const senderType = recipientType === "passenger" ? "driver" : "passenger";
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.rideId, rideId), eq(messages.senderType, senderType)));
  }

  async getUnreadMessageCount(rideId: string, recipientType: string): Promise<number> {
    const senderType = recipientType === "passenger" ? "driver" : "passenger";
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.rideId, rideId),
          eq(messages.senderType, senderType),
          eq(messages.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  // Ratings
  async createRating(insertRating: InsertRating): Promise<Rating> {
    const [rating] = await db.insert(ratings).values(insertRating).returning();
    
    // Update driver's average rating
    const driverRatings = await this.getDriverRatings(insertRating.driverId);
    const avgRating = driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;
    
    await db
      .update(drivers)
      .set({ rating: avgRating.toFixed(2) })
      .where(eq(drivers.id, insertRating.driverId));
    
    return rating;
  }

  async getDriverRatings(driverId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.driverId, driverId)).orderBy(desc(ratings.createdAt));
  }

  async getRideRating(rideId: string): Promise<Rating | undefined> {
    const [rating] = await db.select().from(ratings).where(eq(ratings.rideId, rideId));
    return rating || undefined;
  }

  // Companies
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async getCompanyByEmail(email: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.email, email));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values({
      ...insertCompany,
      plainPassword: insertCompany.password, // For testing phase only!
    }).returning();
    return company;
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return company || undefined;
  }

  async setCompanyOnline(id: string, isOnline: boolean): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ isOnline })
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  // Employees
  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.email, email));
    return employee || undefined;
  }

  async getCompanyEmployees(companyId: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.companyId, companyId)).orderBy(employees.name);
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(insertEmployee).returning();
    return employee;
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | undefined> {
    const [employee] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return employee || undefined;
  }

  async setEmployeeOnline(id: string, isOnline: boolean): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set({ isOnline })
      .where(eq(employees.id, id))
      .returning();
    return employee || undefined;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id));
    return true;
  }

  // Corporate memberships
  async getActiveCorporateMembership(userId: string): Promise<CorporateMembership | null> {
    const [membership] = await db.select().from(corporateMemberships)
      .where(and(
        eq(corporateMemberships.userId, userId),
        eq(corporateMemberships.isActive, true)
      ))
      .limit(1);
    return membership || null;
  }

  // Business Rides
  async createBusinessRide(insertBusinessRide: InsertBusinessRide): Promise<BusinessRide> {
    const [businessRide] = await db.insert(businessRides).values(insertBusinessRide).returning();
    return businessRide;
  }

  async getBusinessRide(id: string): Promise<BusinessRide | undefined> {
    const [businessRide] = await db.select().from(businessRides).where(eq(businessRides.id, id));
    return businessRide || undefined;
  }

  async getCompanyBusinessRides(companyId: string): Promise<(BusinessRide & { ride: Ride | null })[]> {
    const bRides = await db.select().from(businessRides).where(eq(businessRides.companyId, companyId)).orderBy(desc(businessRides.createdAt));
    const result = [];
    for (const br of bRides) {
      const [ride] = await db.select().from(rides).where(eq(rides.id, br.rideId));
      result.push({ ...br, ride: ride || null });
    }
    return result;
  }

  async getCompanyStats(companyId: string): Promise<{ totalRides: number; totalSpent: number; thisMonthRides: number; thisMonthSpent: number }> {
    const bRides = await this.getCompanyBusinessRides(companyId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let totalSpent = 0;
    let thisMonthSpent = 0;
    let thisMonthRides = 0;

    for (const br of bRides) {
      if (br.ride?.finalPrice) {
        totalSpent += br.ride.finalPrice;
        if (br.createdAt && br.createdAt >= startOfMonth) {
          thisMonthSpent += br.ride.finalPrice;
          thisMonthRides++;
        }
      }
    }

    return {
      totalRides: bRides.length,
      totalSpent,
      thisMonthRides,
      thisMonthSpent
    };
  }

  // Invoices
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getCompanyInvoices(companyId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(desc(invoices.createdAt));
  }

  async updateInvoiceStatus(id: string, status: string, paidAt?: Date): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set({ status, paidAt }).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  async generateInvoice(companyId: string, periodStart: Date, periodEnd: Date): Promise<Invoice | undefined> {
    const bRides = await db.select().from(businessRides).where(
      and(
        eq(businessRides.companyId, companyId),
        between(businessRides.createdAt, periodStart, periodEnd)
      )
    );

    if (bRides.length === 0) return undefined;

    let totalAmount = 0;
    for (const br of bRides) {
      const [ride] = await db.select().from(rides).where(eq(rides.id, br.rideId));
      if (ride?.finalPrice) totalAmount += ride.finalPrice;
    }

    const invoiceNumber = `FV/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const [invoice] = await db.insert(invoices).values({
      companyId,
      invoiceNumber,
      periodStart,
      periodEnd,
      totalAmount,
      rideCount: bRides.length,
      status: "pending",
      dueDate
    }).returning();

    for (const br of bRides) {
      const [ride] = await db.select().from(rides).where(eq(rides.id, br.rideId));
      await db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        businessRideId: br.id,
        amount: ride?.finalPrice || 0,
        description: `${ride?.pickupLocation} → ${ride?.destination}`
      });
    }

    return invoice;
  }

  async getInvoiceItems(invoiceId: string): Promise<(InvoiceItem & { businessRide: BusinessRide | null; ride: Ride | null })[]> {
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    const result = [];
    for (const item of items) {
      const [br] = await db.select().from(businessRides).where(eq(businessRides.id, item.businessRideId));
      let ride: Ride | null = null;
      if (br) {
        const [r] = await db.select().from(rides).where(eq(rides.id, br.rideId));
        ride = r || null;
      }
      result.push({ ...item, businessRide: br || null, ride });
    }
    return result;
  }

  // Push subscriptions
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // Delete existing subscription for this driver with same endpoint
    await db.delete(pushSubscriptions).where(
      and(
        eq(pushSubscriptions.driverId, subscription.driverId),
        eq(pushSubscriptions.endpoint, subscription.endpoint)
      )
    );
    const [sub] = await db.insert(pushSubscriptions).values(subscription).returning();
    return sub;
  }

  async getDriverPushSubscriptions(driverId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.driverId, driverId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  // FCM tokens
  async saveFcmToken(tokenData: InsertFcmToken): Promise<FcmToken> {
    await db.delete(fcmTokens).where(
      and(
        eq(fcmTokens.userId, tokenData.userId),
        eq(fcmTokens.token, tokenData.token)
      )
    );
    const [saved] = await db.insert(fcmTokens).values({
      ...tokenData,
      lastUpdatedAt: new Date(),
    }).returning();
    return saved;
  }

  async getFcmTokensByUserId(userId: string, userType: string): Promise<FcmToken[]> {
    return db.select().from(fcmTokens).where(
      and(
        eq(fcmTokens.userId, userId),
        eq(fcmTokens.userType, userType)
      )
    );
  }

  async deleteFcmToken(token: string): Promise<void> {
    await db.delete(fcmTokens).where(eq(fcmTokens.token, token));
  }

  // Password reset tokens
  async createPasswordResetToken(userId: string): Promise<PasswordResetToken> {
    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    
    // Create new token (valid for 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    const [resetToken] = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt
    }).returning();
    
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  // Admin methods
  async getAdmin(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin || undefined;
  }

  async getAdminByPhone(phone: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.phone, phone));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values({
      ...insertAdmin,
      plainPassword: insertAdmin.password,
    }).returning();
    return admin;
  }

  async updateAdmin(id: string, data: Partial<Admin>): Promise<Admin | undefined> {
    const [updated] = await db.update(admins).set(data).where(eq(admins.id, id)).returning();
    return updated || undefined;
  }

  async countAdmins(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(admins);
    return Number(result[0]?.count || 0);
  }

  async deleteAdmin(id: string): Promise<void> {
    const count = await this.countAdmins();
    if (count <= 1) {
      throw new Error("Cannot delete last admin");
    }
    await db.delete(admins).where(eq(admins.id, id));
  }

  async getAllAdmins(): Promise<Admin[]> {
    return db.select().from(admins).orderBy(desc(admins.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllDrivers(): Promise<Driver[]> {
    return db.select().from(drivers).orderBy(desc(drivers.createdAt));
  }

  async getEligibleDriversCandidates(
    centerLat: number,
    centerLng: number,
    maxDistanceKm: number,
    excludeDriverIds: string[],
    limit: number
  ): Promise<Driver[]> {
    const latDelta = maxDistanceKm / 111.0;
    const lngDelta = maxDistanceKm / (111.0 * Math.cos(centerLat * Math.PI / 180));
    const minLat = (centerLat - latDelta).toString();
    const maxLat = (centerLat + latDelta).toString();
    const minLng = (centerLng - lngDelta).toString();
    const maxLng = (centerLng + lngDelta).toString();

    const conditions = [
      sql`${drivers.currentLat} IS NOT NULL`,
      sql`${drivers.currentLng} IS NOT NULL`,
      sql`CAST(${drivers.currentLat} AS DOUBLE PRECISION) BETWEEN ${minLat}::DOUBLE PRECISION AND ${maxLat}::DOUBLE PRECISION`,
      sql`CAST(${drivers.currentLng} AS DOUBLE PRECISION) BETWEEN ${minLng}::DOUBLE PRECISION AND ${maxLng}::DOUBLE PRECISION`,
      sql`(${drivers.isBlocked} IS NULL OR ${drivers.isBlocked} = false)`,
      sql`${drivers.subscriptionStatus} IN ('trial', 'active', 'grace')`,
    ];

    if (excludeDriverIds.length > 0) {
      const excludeList = excludeDriverIds.map(id => `'${id}'`).join(',');
      conditions.push(sql`${drivers.id} NOT IN (${sql.raw(excludeList)})`);
    }

    const result = await db.select().from(drivers)
      .where(and(...conditions))
      .limit(limit);

    return result;
  }

  async getAllCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async deleteDriver(id: string): Promise<void> {
    await db.delete(drivers).where(eq(drivers.id, id));
  }

  async updateDriver(id: string, data: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set(data)
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // Session management - invalidate previous sessions for single session enforcement
  async invalidateDriverSessions(driverId: string): Promise<void> {
    try {
      await db.execute(
        sql`UPDATE session SET sess = (sess::jsonb - 'driverId' - 'driverName' - 'driverLastActivity')::json WHERE sess->>'driverId' = ${driverId}`
      );
      await db.execute(
        sql`DELETE FROM session WHERE sess->>'driverId' = ${driverId}`
      );
      console.log("[SESSION_INVALIDATE] Driver sessions cleared for:", driverId);
    } catch (error: any) {
      console.error("[SESSION_INVALIDATE_ERROR] Failed to invalidate driver sessions:", error?.message, error?.stack);
    }
  }

  async invalidatePassengerSessions(passengerId: string): Promise<void> {
    try {
      await db.execute(
        sql`UPDATE session SET sess = (sess::jsonb - 'passengerId' - 'passengerName' - 'passengerLastActivity')::json WHERE sess->>'passengerId' = ${passengerId}`
      );
      await db.execute(
        sql`DELETE FROM session WHERE sess->>'passengerId' = ${passengerId}`
      );
      console.log("[SESSION_INVALIDATE] Passenger sessions cleared for:", passengerId);
    } catch (error: any) {
      console.error("[SESSION_INVALIDATE_ERROR] Failed to invalidate passenger sessions:", error?.message, error?.stack);
    }
  }

  async getActivePromotions(): Promise<Promotion[]> {
    return db.select().from(promotions)
      .where(eq(promotions.isActive, true))
      .orderBy(desc(promotions.featured), promotions.sortOrder);
  }

  async getHomeContent(): Promise<{ heroVideoUrl: string; heroHeadline: string; liveMessage: string }> {
    const rows = await db.select().from(homeContent).limit(1);
    if (rows.length > 0) {
      return {
        heroVideoUrl: rows[0].heroVideoUrl || "",
        heroHeadline: rows[0].heroHeadline || "",
        liveMessage: rows[0].liveMessage || "",
      };
    }
    return { heroVideoUrl: "", heroHeadline: "", liveMessage: "" };
  }

  async invalidateAdminSessions(adminId: string): Promise<void> {
    try {
      await db.execute(
        sql`UPDATE session SET sess = (sess::jsonb - 'adminId')::json WHERE sess->>'adminId' = ${String(adminId)}`
      );
      await db.execute(
        sql`DELETE FROM session WHERE sess->>'adminId' = ${String(adminId)}`
      );
      console.log("[SESSION_INVALIDATE] Admin sessions cleared for:", adminId);
    } catch (error: any) {
      console.error("[SESSION_INVALIDATE_ERROR] Failed to invalidate admin sessions:", error?.message, error?.stack);
    }
  }

  async hasActiveDriverSession(driverId: string): Promise<boolean> {
    try {
      const result = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM session WHERE sess->>'driverId' = ${driverId}`
      );
      return Number((result as any).rows?.[0]?.cnt || 0) > 0;
    } catch { return false; }
  }

  async hasActivePassengerSession(passengerId: string): Promise<boolean> {
    try {
      const result = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM session WHERE sess->>'passengerId' = ${passengerId}`
      );
      return Number((result as any).rows?.[0]?.cnt || 0) > 0;
    } catch { return false; }
  }

  async hasActiveAdminSession(adminId: string): Promise<boolean> {
    try {
      const result = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM session WHERE sess->>'adminId' = ${adminId}`
      );
      return Number((result as any).rows?.[0]?.cnt || 0) > 0;
    } catch { return false; }
  }

  // Referral methods
  async getDriverByReferralCode(code: string): Promise<Driver | undefined> {
    const trimmed = code.trim();

    if (trimmed.includes('/')) {
      const slashIdx = trimmed.indexOf('/');
      const licenseNum = trimmed.substring(0, slashIdx).trim();
      const municipality = trimmed.substring(slashIdx + 1).trim();
      const withoutPrefix = licenseNum.replace(/^ID\s+/i, '');
      const withPrefix = `ID ${withoutPrefix}`;
      const [driver] = await db.select().from(drivers).where(
        and(
          or(
            eq(drivers.taxiLicenseNumber, withoutPrefix),
            eq(drivers.taxiLicenseNumber, withPrefix),
            eq(drivers.taxiLicenseNumber, licenseNum)
          ),
          eq(drivers.licenseIssuingAuthority, municipality)
        )
      );
      if (driver) return driver;
    }

    const withoutPrefix = trimmed.replace(/^ID\s+/i, '');
    const withPrefix = `ID ${withoutPrefix}`;
    const [driver] = await db.select().from(drivers).where(
      or(
        eq(drivers.referralCode, trimmed),
        eq(drivers.taxiLicenseNumber, trimmed),
        eq(drivers.taxiLicenseNumber, withoutPrefix),
        eq(drivers.taxiLicenseNumber, withPrefix)
      )
    );
    return driver || undefined;
  }

  async createReferral(data: {
    referrerDriverId: string;
    referredUserId?: string;
    referredDriverId?: string;
    referralType: string;
    referralCode: string;
  }): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(data).returning();
    return referral;
  }

  async getReferralsByDriver(driverId: string): Promise<Referral[]> {
    return db.select().from(referrals)
      .where(eq(referrals.referrerDriverId, driverId))
      .orderBy(desc(referrals.createdAt));
  }

  async getAllReferrals(): Promise<Referral[]> {
    return db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }

  async updateReferralStatus(id: string, status: string, rewardDescription?: string): Promise<Referral | undefined> {
    const updateData: any = { status };
    if (status === 'confirmed') updateData.confirmedAt = new Date();
    if (status === 'rewarded') {
      updateData.rewardedAt = new Date();
      updateData.rewardGranted = true;
      if (rewardDescription) updateData.rewardDescription = rewardDescription;
    }
    const [referral] = await db.update(referrals).set(updateData).where(eq(referrals.id, id)).returning();
    return referral || undefined;
  }

  async incrementDriverReferralCount(driverId: string, type: 'driver' | 'passenger'): Promise<void> {
    if (type === 'driver') {
      await db.execute(sql`UPDATE drivers SET referred_drivers_count = COALESCE(referred_drivers_count, 0) + 1 WHERE id = ${driverId}`);
    } else {
      await db.execute(sql`UPDATE drivers SET referred_passengers_count = COALESCE(referred_passengers_count, 0) + 1 WHERE id = ${driverId}`);
    }
  }

  async addDriverReferralPoints(driverId: string, points: number): Promise<void> {
    await db.execute(sql`UPDATE drivers SET referral_points = COALESCE(referral_points, 0) + ${points} WHERE id = ${driverId}`);
  }

  async getReferralByReferredDriver(driverId: string): Promise<Referral | undefined> {
    const [ref] = await db.select().from(referrals)
      .where(and(eq(referrals.referredDriverId, driverId), eq(referrals.referralType, 'driver')));
    return ref || undefined;
  }

  async getReferralByReferredUser(userId: string): Promise<Referral | undefined> {
    const [ref] = await db.select().from(referrals)
      .where(and(eq(referrals.referredUserId, userId), eq(referrals.referralType, 'passenger')));
    return ref || undefined;
  }

  // Referral payout methods
  async createReferralPayout(data: {
    referralId: string;
    driverId: string;
    amount: number;
    description?: string;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
  }): Promise<ReferralPayout> {
    const [payout] = await db.insert(referralPayouts).values(data).returning();
    return payout;
  }

  async getAllReferralPayouts(): Promise<ReferralPayout[]> {
    return db.select().from(referralPayouts).orderBy(desc(referralPayouts.createdAt));
  }

  async getReferralPayoutsByDriver(driverId: string): Promise<ReferralPayout[]> {
    return db.select().from(referralPayouts)
      .where(eq(referralPayouts.driverId, driverId))
      .orderBy(desc(referralPayouts.createdAt));
  }

  async markPayoutAsPaid(payoutId: string, adminId: string, notes?: string): Promise<ReferralPayout | undefined> {
    const [payout] = await db.update(referralPayouts)
      .set({ status: 'paid', paidAt: new Date(), paidBy: adminId, notes })
      .where(eq(referralPayouts.id, payoutId))
      .returning();
    return payout || undefined;
  }

  async cancelPayout(payoutId: string, adminId: string, notes?: string): Promise<ReferralPayout | undefined> {
    const [payout] = await db.update(referralPayouts)
      .set({ status: 'cancelled', paidBy: adminId, notes })
      .where(eq(referralPayouts.id, payoutId))
      .returning();
    return payout || undefined;
  }

  async updateDriverBankAccount(driverId: string, bankAccountNumber: string, bankAccountHolder: string): Promise<Driver | undefined> {
    const [driver] = await db.update(drivers)
      .set({ bankAccountNumber, bankAccountHolder })
      .where(eq(drivers.id, driverId))
      .returning();
    return driver || undefined;
  }

  // Loyalty / Referral discount system
  async getCompletedRideCountBetween(passengerId: string, driverId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rides)
      .where(
        and(
          eq(rides.passengerId, passengerId),
          eq(rides.driverId, driverId),
          eq(rides.status, "completed")
        )
      );
    return result[0]?.count || 0;
  }

  async getPassengerReferralStatus(passengerId: string): Promise<{ eligible: boolean; expirationDate: Date | null; referrerDriverId: string | null }> {
    const user = await this.getUser(passengerId);
    if (!user) return { eligible: false, expirationDate: null, referrerDriverId: null };
    const eligible = user.referralEligible === true && 
      (user.referralExpirationDate ? new Date(user.referralExpirationDate) > new Date() : false);
    return {
      eligible,
      expirationDate: user.referralExpirationDate ? new Date(user.referralExpirationDate) : null,
      referrerDriverId: user.referrerDriverId,
    };
  }

  async checkAndGrantReferralEligibility(passengerId: string): Promise<boolean> {
    const user = await this.getUser(passengerId);
    if (!user || !user.referrerDriverId) return false;
    if (user.referralEligible) return true;
    if (user.referralStatus === "rewarded") return false;

    const completedRides = await db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.passengerId, passengerId),
          eq(rides.status, "completed"),
          sql`${rides.finalPrice} >= 5000`
        )
      );

    if (completedRides.length >= 2) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60);
      await db
        .update(users)
        .set({
          referralEligible: true,
          referralExpirationDate: expirationDate,
          referralStatus: "confirmed",
        } as any)
        .where(eq(users.id, passengerId));
      return true;
    }
    return false;
  }

  async applyReferralDiscount(rideId: string, passengerId: string, driverId: string): Promise<{ success: boolean; error?: string }> {
    const user = await this.getUser(passengerId);
    if (!user) return { success: false, error: "Użytkownik nie znaleziony" };
    if (!user.referralEligible) return { success: false, error: "Brak prawa do rabatu" };
    if (user.referralExpirationDate && new Date(user.referralExpirationDate) < new Date()) {
      await db.update(users).set({ referralEligible: false } as any).where(eq(users.id, passengerId));
      return { success: false, error: "Rabat wygasł" };
    }
    if (user.referrerDriverId === driverId) return { success: false, error: "Nie można użyć rabatu u kierowcy polecającego" };

    const ride = await this.getRide(rideId);
    if (!ride) return { success: false, error: "Kurs nie znaleziony" };
    const price = ride.finalPrice || ride.estimatedPrice || 0;
    if (price < 5000) return { success: false, error: "Cena kursu poniżej 50 zł" };

    const rideCount = await this.getCompletedRideCountBetween(passengerId, driverId);
    if (rideCount < 2) return { success: false, error: `Potrzeba min. 2 zakończonych kursów z tym kierowcą (masz: ${rideCount})` };

    const driver = await this.getDriver(driverId);
    if (!driver) return { success: false, error: "Kierowca nie znaleziony" };
    if ((driver.loyaltyBudget || 0) < 2000) return { success: false, error: "Budżet lojalnościowy kierowcy jest zbyt niski" };

    const newPrice = price - 2000;
    await db.update(rides).set({ finalPrice: newPrice }).where(eq(rides.id, rideId));
    await db.update(users).set({ referralEligible: false, referralStatus: "rewarded" } as any).where(eq(users.id, passengerId));
    await db.update(drivers).set({ loyaltyBudget: sql`${drivers.loyaltyBudget} - 2000` } as any).where(eq(drivers.id, driverId));

    return { success: true };
  }

  async getDriverLoyaltyBudget(driverId: string): Promise<number> {
    const driver = await this.getDriver(driverId);
    return driver?.loyaltyBudget || 0;
  }

  async getFavoriteDriverIds(passengerId: string): Promise<string[]> {
    const rows = await db.select({ driverId: favoriteDrivers.driverId })
      .from(favoriteDrivers)
      .where(eq(favoriteDrivers.passengerId, passengerId));
    return rows.map(r => r.driverId);
  }

  async getDriverByLicenseNumber(licenseNumber: string): Promise<Driver | undefined> {
    const trimmed = licenseNumber.trim();
    const [driver] = await db.select().from(drivers).where(eq(drivers.taxiLicenseNumber, trimmed));
    return driver || undefined;
  }

  async addFavoriteDriver(passengerId: string, driverId: string): Promise<FavoriteDriver> {
    const [existing] = await db.select().from(favoriteDrivers)
      .where(and(eq(favoriteDrivers.passengerId, passengerId), eq(favoriteDrivers.driverId, driverId)));
    if (existing) return existing;
    const [row] = await db.insert(favoriteDrivers).values({ passengerId, driverId }).returning();
    return row;
  }

  async removeFavoriteDriver(passengerId: string, driverId: string): Promise<void> {
    await db.delete(favoriteDrivers)
      .where(and(eq(favoriteDrivers.passengerId, passengerId), eq(favoriteDrivers.driverId, driverId)));
  }

  async getFavoriteDrivers(passengerId: string): Promise<FavoriteDriver[]> {
    return await db.select().from(favoriteDrivers)
      .where(eq(favoriteDrivers.passengerId, passengerId));
  }

  // System messages
  async createSystemMessage(data: Partial<SystemMessage>): Promise<SystemMessage> {
    const [msg] = await db.insert(systemMessages).values(data as any).returning();
    return msg;
  }

  async getSystemMessages(): Promise<SystemMessage[]> {
    return await db.select().from(systemMessages).orderBy(desc(systemMessages.createdAt));
  }

  async getSystemMessage(id: string): Promise<SystemMessage | undefined> {
    const [msg] = await db.select().from(systemMessages).where(eq(systemMessages.id, id));
    return msg || undefined;
  }

  async deactivateSystemMessage(id: string): Promise<void> {
    await db.update(systemMessages).set({ isActive: false }).where(eq(systemMessages.id, id));
  }

  async getActiveMessagesForRole(role: string): Promise<SystemMessage[]> {
    return await db.select().from(systemMessages)
      .where(and(
        or(
          eq(systemMessages.targetRole, role),
          eq(systemMessages.targetRole, "ALL")
        ),
        eq(systemMessages.isActive, true),
        or(
          sql`${systemMessages.expiresAt} IS NULL`,
          sql`${systemMessages.expiresAt} > now()`
        )
      ))
      .orderBy(desc(systemMessages.createdAt));
  }

  async getPendingRequiredMessages(userId: string, role: string): Promise<SystemMessage[]> {
    const active = await this.getActiveMessagesForRole(role);
    const required = active.filter(m => m.requireAcknowledgement && m.forceOnLogin);
    if (required.length === 0) return [];

    const reads = await db.select().from(userMessageReads)
      .where(and(
        eq(userMessageReads.userId, userId),
        sql`${userMessageReads.acknowledgedAt} IS NOT NULL`
      ));
    const acknowledgedIds = new Set(reads.map(r => r.messageId));
    return required.filter(m => !acknowledgedIds.has(m.id));
  }

  async markMessageRead(userId: string, userRole: string, messageId: string): Promise<UserMessageRead> {
    const [existing] = await db.select().from(userMessageReads)
      .where(and(eq(userMessageReads.userId, userId), eq(userMessageReads.messageId, messageId)));
    if (existing) return existing;
    const [row] = await db.insert(userMessageReads).values({ userId, userRole, messageId }).returning();
    return row;
  }

  async acknowledgeMessage(userId: string, messageId: string): Promise<UserMessageRead | undefined> {
    const [existing] = await db.select().from(userMessageReads)
      .where(and(eq(userMessageReads.userId, userId), eq(userMessageReads.messageId, messageId)));
    if (!existing) return undefined;
    const [updated] = await db.update(userMessageReads)
      .set({ acknowledgedAt: new Date() })
      .where(eq(userMessageReads.id, existing.id))
      .returning();
    return updated;
  }

  async getMessageReadStats(messageId: string): Promise<{ totalRead: number; totalAcknowledged: number }> {
    const reads = await db.select().from(userMessageReads)
      .where(eq(userMessageReads.messageId, messageId));
    return {
      totalRead: reads.length,
      totalAcknowledged: reads.filter(r => r.acknowledgedAt !== null).length,
    };
  }

  async getUnreadSystemMessageCount(userId: string, role: string): Promise<number> {
    const active = await this.getActiveMessagesForRole(role);
    if (active.length === 0) return 0;
    const reads = await db.select().from(userMessageReads)
      .where(eq(userMessageReads.userId, userId));
    const readIds = new Set(reads.map(r => r.messageId));
    return active.filter(m => !readIds.has(m.id)).length;
  }

  async getUserMessageReadStatus(userId: string, messageIds: string[]): Promise<UserMessageRead[]> {
    if (messageIds.length === 0) return [];
    return await db.select().from(userMessageReads)
      .where(and(
        eq(userMessageReads.userId, userId),
        sql`${userMessageReads.messageId} IN (${sql.join(messageIds.map(id => sql`${id}`), sql`, `)})`
      ));
  }
}

export const storage = new DatabaseStorage();
