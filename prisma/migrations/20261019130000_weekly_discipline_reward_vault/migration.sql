ALTER TABLE "Reward"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Lifestyle',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Reward"
ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE "WeeklyDisciplineScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "plannedCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "requiredThreshold" INTEGER NOT NULL DEFAULT 80,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyDisciplineScore_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RewardRedemption"
ADD COLUMN "weeklyScoreId" TEXT;

CREATE UNIQUE INDEX "WeeklyDisciplineScore_userId_weekStartDate_key"
ON "WeeklyDisciplineScore"("userId", "weekStartDate");

CREATE INDEX "WeeklyDisciplineScore_userId_weekEndDate_idx"
ON "WeeklyDisciplineScore"("userId", "weekEndDate");

CREATE UNIQUE INDEX "RewardRedemption_weeklyScoreId_rewardId_key"
ON "RewardRedemption"("weeklyScoreId", "rewardId");

ALTER TABLE "WeeklyDisciplineScore"
ADD CONSTRAINT "WeeklyDisciplineScore_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RewardRedemption"
ADD CONSTRAINT "RewardRedemption_weeklyScoreId_fkey"
FOREIGN KEY ("weeklyScoreId") REFERENCES "WeeklyDisciplineScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
