-- CreateEnum
CREATE TYPE "VoteLevel" AS ENUM ('PREFER', 'OK', 'CANT');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "SlotVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "level" "VoteLevel" NOT NULL,

    CONSTRAINT "SlotVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotVote_sessionId_playerId_key" ON "SlotVote"("sessionId", "playerId");

-- CreateIndex
CREATE INDEX "Session_groupId_idx" ON "Session"("groupId");

-- AddForeignKey
ALTER TABLE "SlotVote" ADD CONSTRAINT "SlotVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotVote" ADD CONSTRAINT "SlotVote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
