ALTER TABLE "User" ADD COLUMN "authUserId" TEXT;

CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

DROP INDEX "PointTransaction_eventKey_key";
CREATE UNIQUE INDEX "PointTransaction_userId_eventKey_key" ON "PointTransaction"("userId", "eventKey");

DROP INDEX "RewardRedemption_eventKey_key";
CREATE UNIQUE INDEX "RewardRedemption_userId_eventKey_key" ON "RewardRedemption"("userId", "eventKey");
