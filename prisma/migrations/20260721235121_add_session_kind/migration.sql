-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('PRACTICE', 'GAME');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "kind" "SessionKind" NOT NULL DEFAULT 'PRACTICE';
