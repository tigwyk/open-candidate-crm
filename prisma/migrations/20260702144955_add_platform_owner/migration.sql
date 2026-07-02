-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: on any deployment that already has users (e.g. an existing
-- production install), grant platform ownership to whoever's account is
-- oldest, so existing single-candidate deployments get this for free with
-- no manual step. No-op on fresh installs, where the signup/seed routes
-- already set this correctly at creation time.
UPDATE "User" SET "isPlatformOwner" = true
WHERE id = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM "User" WHERE "isPlatformOwner" = true);
