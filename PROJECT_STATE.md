# TaxiQ – Project State

## PROD
- URL: https://taxiq.com.pl
- Working modules: Passenger app, Business portal, Admin panel, Object storage, Push notifications, FCM, Twilio IVR, Driver auth
- Broken modules: None identified

## DEV
- Branch: detached HEAD
- Last change: Cleaned up driver dashboard — removed both verification blocks, added ID card upload in profile section with working presigned URL flow
- Build status: SUCCESS (vite build 11.70s, bundle 1039 kB)

## VERIFICATION SYSTEM (current)
- Flow: Driver uploads taxi ID photo (presigned URL → Object Storage → /api/driver/upload-id-card) → status becomes `pending_verification` → Admin reviews in panel (sees both selfie + ID card) → approve/reject
- Go-online gate: `verificationStatus === "approved"` (single check)
- Statuses in use: UNVERIFIED, pending_verification, pending_admin_review, approved, rejected
- Driver dashboard: NO verification blocks at top; ID card upload is in profile tab alongside profile photo
- Admin panel: Dialog shows both photos side-by-side with "Powiększ" button for ID card

## NEXT_STEP
- Deploy to production
- Verify remaining endpoints (rides, stats, profile editing, etc.)

## BACKUP_STATUS
- Full backup: /home/runner/TAXIQ_FULL_BACKUP_20260225_213904.tar.gz (885 MB, 17338 files)
- Checkpoint: Replit auto-checkpoint 971e71b5
- Rollback possible: YES

## CHANGES LOG (this session)
- server/auth-routes.ts — NEW FILE: 8 auth endpoints
- server/routes.ts — Cleaned verify endpoint, upload-id-card endpoint works
- server/storage.ts — Removed VERIFIED from getOnlineDrivers
- server/services/cityVerification.ts — DELETED
- server/services/driverVerification.ts — DELETED
- shared/schema.ts — Removed 17 dead OCR/city columns
- client/src/pages/driver-dashboard.tsx:
  - Removed verificationSection (old yellow card)
  - Removed DriverVerificationCard (pulsating card)
  - Added IdCardUploadSection with presigned URL flow
  - Cleaned online button to use only "approved" status
- client/src/pages/verify-driver.tsx — photoUrl instead of extractedPhotoUrl
- client/src/components/admin-driver-verification.tsx — Simplified filters
- replit.md — Updated verification description
