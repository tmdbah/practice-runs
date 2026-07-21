-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'PROPOSED';
