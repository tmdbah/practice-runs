-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ANYTIME', 'SPECIFIC', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayDefault" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'UNAVAILABLE',
    "fromTime" TEXT,
    "toTime" TEXT,
    "note" TEXT,

    CONSTRAINT "DayDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateOverride" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL,
    "fromTime" TEXT,
    "toTime" TEXT,
    "note" TEXT,

    CONSTRAINT "DateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DayDefault_playerId_dayOfWeek_key" ON "DayDefault"("playerId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "DateOverride_playerId_date_key" ON "DateOverride"("playerId", "date");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayDefault" ADD CONSTRAINT "DayDefault_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateOverride" ADD CONSTRAINT "DateOverride_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
