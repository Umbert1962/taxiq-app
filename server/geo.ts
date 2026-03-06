export const MAX_DRIVER_DISTANCE_KM = 2.5;

export const LOCAL_RADIUS_STEPS_KM = [2.5, 5, 10];
export const LOCAL_MAX_RADIUS_KM = 10;
export const LONG_PICKUP_MAX_DISTANCE_KM = 60;
export const LONG_PICKUP_DRIVER_LIMIT = 10;
export const OFFER_TIMEOUT_SECONDS = 90;
export const MAX_SEARCH_DURATION_SECONDS = 480;
export const MAX_DRIVER_NOTIFICATIONS_PER_RIDE = 2;

export function normalizePolishPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
  if (cleaned.startsWith('0048')) cleaned = '+48' + cleaned.slice(4);
  if (/^\d{9}$/.test(cleaned)) cleaned = '+48' + cleaned;
  if (/^48\d{9}$/.test(cleaned)) cleaned = '+' + cleaned;
  return cleaned;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface DriverWithLocation {
  id: string;
  currentLat: string | null;
  currentLng: string | null;
  isOnline: boolean | null;
}

export interface DriverForSearch extends DriverWithLocation {
  subscriptionStatus: string | null;
  isBlocked: boolean | null;
  isActive?: boolean | null;
}

export interface DriverWithDistance {
  id: string;
  distanceKm: number;
  isOnline: boolean;
}

export interface NearbyFilterResult {
  nearbyDriverIds: string[];
  totalOnlineDrivers: number;
  driversWithinRadius: number;
  radiusKm: number;
}

export interface SearchResult {
  onlineDriverIds: string[];
  offlineDriverIds: string[];
  radiusKm: number;
  mode: "local" | "long_pickup";
  totalFound: number;
}

export interface SearchMetrics {
  rideId: string;
  searchMode: "LOCAL" | "LONG" | "NONE";
  usedRadius: number;
  driversFoundCount: number;
  fallbackActivated: boolean;
  onlineCount: number;
  offlineCount: number;
}

export function filterNearbyDrivers(
  drivers: DriverWithLocation[],
  pickupLat: number,
  pickupLng: number,
  radiusKm: number = MAX_DRIVER_DISTANCE_KM
): NearbyFilterResult {
  const nearbyDriverIds: string[] = [];

  for (const driver of drivers) {
    if (!driver.currentLat || !driver.currentLng) continue;

    const dLat = parseFloat(driver.currentLat);
    const dLng = parseFloat(driver.currentLng);
    if (isNaN(dLat) || isNaN(dLng)) continue;

    const dist = haversineDistance(dLat, dLng, pickupLat, pickupLng);
    if (dist <= radiusKm) {
      nearbyDriverIds.push(driver.id);
    }
  }

  return {
    nearbyDriverIds,
    totalOnlineDrivers: drivers.length,
    driversWithinRadius: nearbyDriverIds.length,
    radiusKm,
  };
}

function isSubscriptionActive(status: string | null): boolean {
  return status === "trial" || status === "active" || status === "grace";
}

function computeDriverDistances(
  drivers: DriverForSearch[],
  pickupLat: number,
  pickupLng: number,
  busyDriverIds: Set<string>,
  bannedDriverIds: Set<string> = new Set()
): DriverWithDistance[] {
  const result: DriverWithDistance[] = [];
  for (const driver of drivers) {
    if (!driver.currentLat || !driver.currentLng) continue;
    if (driver.isActive === false) continue;
    if (driver.isBlocked) continue;
    if (!isSubscriptionActive(driver.subscriptionStatus)) continue;
    if (busyDriverIds.has(driver.id)) continue;
    if (bannedDriverIds.has(driver.id)) continue;

    const dLat = parseFloat(driver.currentLat);
    const dLng = parseFloat(driver.currentLng);
    if (isNaN(dLat) || isNaN(dLng)) continue;

    const dist = haversineDistance(dLat, dLng, pickupLat, pickupLng);
    result.push({
      id: driver.id,
      distanceKm: dist,
      isOnline: driver.isOnline === true,
    });
  }
  return result;
}

export function searchDriversLocal(
  allDrivers: DriverForSearch[],
  pickupLat: number,
  pickupLng: number,
  busyDriverIds: Set<string>,
  favoriteDriverIds: Set<string> = new Set(),
  bannedDriverIds: Set<string> = new Set()
): SearchResult | null {
  const driversWithDist = computeDriverDistances(allDrivers, pickupLat, pickupLng, busyDriverIds, bannedDriverIds);

  for (const radiusKm of LOCAL_RADIUS_STEPS_KM) {
    const inRadius = driversWithDist.filter(d => d.distanceKm <= radiusKm);
    if (inRadius.length > 0) {
      if (favoriteDriverIds.size > 0) {
        inRadius.sort((a, b) => {
          const aFav = favoriteDriverIds.has(a.id) ? 1 : 0;
          const bFav = favoriteDriverIds.has(b.id) ? 1 : 0;
          return bFav - aFav;
        });
      }
      const onlineDriverIds = inRadius.filter(d => d.isOnline).map(d => d.id);
      const offlineDriverIds = inRadius.filter(d => !d.isOnline).map(d => d.id);
      return {
        onlineDriverIds,
        offlineDriverIds,
        radiusKm,
        mode: "local",
        totalFound: inRadius.length,
      };
    }
  }

  return null;
}

export function searchDriversLongPickup(
  sqlCandidates: DriverForSearch[],
  pickupLat: number,
  pickupLng: number,
  busyDriverIds: Set<string>,
  favoriteDriverIds: Set<string> = new Set(),
  bannedDriverIds: Set<string> = new Set()
): SearchResult | null {
  const driversWithDist = computeDriverDistances(sqlCandidates, pickupLat, pickupLng, busyDriverIds, bannedDriverIds);

  const inRange = driversWithDist
    .filter(d => d.distanceKm <= LONG_PICKUP_MAX_DISTANCE_KM)
    .sort((a, b) => {
      const aFav = favoriteDriverIds.has(a.id) ? 1 : 0;
      const bFav = favoriteDriverIds.has(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, LONG_PICKUP_DRIVER_LIMIT);

  if (inRange.length === 0) return null;

  const onlineDriverIds = inRange.filter(d => d.isOnline).map(d => d.id);
  const offlineDriverIds = inRange.filter(d => !d.isOnline).map(d => d.id);

  const totalNotifications = onlineDriverIds.length + offlineDriverIds.length;
  if (totalNotifications > LONG_PICKUP_DRIVER_LIMIT) {
    console.error(`[SEARCH_HARD_LIMIT_BREACH] long_pickup would notify ${totalNotifications} drivers, capping at ${LONG_PICKUP_DRIVER_LIMIT}`);
  }

  return {
    onlineDriverIds,
    offlineDriverIds,
    radiusKm: LONG_PICKUP_MAX_DISTANCE_KM,
    mode: "long_pickup",
    totalFound: inRange.length,
  };
}

export function searchDriversWithGuard(
  rideId: string,
  allDrivers: DriverForSearch[],
  pickupLat: number,
  pickupLng: number,
  busyDriverIds: Set<string>,
  sqlLongPickupCandidates?: DriverForSearch[],
  favoriteDriverIds: Set<string> = new Set(),
  bannedDriverIds: Set<string> = new Set()
): { result: SearchResult | null; metrics: SearchMetrics } {
  const localResult = searchDriversLocal(allDrivers, pickupLat, pickupLng, busyDriverIds, favoriteDriverIds, bannedDriverIds);

  if (localResult) {
    const metrics: SearchMetrics = {
      rideId,
      searchMode: "LOCAL",
      usedRadius: localResult.radiusKm,
      driversFoundCount: localResult.totalFound,
      fallbackActivated: false,
      onlineCount: localResult.onlineDriverIds.length,
      offlineCount: localResult.offlineDriverIds.length,
    };
    return { result: localResult, metrics };
  }

  const longCandidates = sqlLongPickupCandidates || allDrivers;
  const longResult = searchDriversLongPickup(longCandidates, pickupLat, pickupLng, busyDriverIds, favoriteDriverIds, bannedDriverIds);

  if (longResult) {
    const metrics: SearchMetrics = {
      rideId,
      searchMode: "LONG",
      usedRadius: longResult.radiusKm,
      driversFoundCount: longResult.totalFound,
      fallbackActivated: true,
      onlineCount: longResult.onlineDriverIds.length,
      offlineCount: longResult.offlineDriverIds.length,
    };
    return { result: longResult, metrics };
  }

  const metrics: SearchMetrics = {
    rideId,
    searchMode: "NONE",
    usedRadius: LONG_PICKUP_MAX_DISTANCE_KM,
    driversFoundCount: 0,
    fallbackActivated: true,
    onlineCount: 0,
    offlineCount: 0,
  };
  return { result: null, metrics };
}
