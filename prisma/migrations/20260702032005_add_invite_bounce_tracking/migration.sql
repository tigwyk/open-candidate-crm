-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "bounceType" TEXT,
ADD COLUMN     "bouncedAt" TIMESTAMP(3),
ADD COLUMN     "postmarkBounceId" INTEGER,
ADD COLUMN     "postmarkMessageId" TEXT;
