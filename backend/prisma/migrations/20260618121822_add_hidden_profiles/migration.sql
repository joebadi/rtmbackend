-- CreateTable
CREATE TABLE "hidden_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hiddenUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hidden_profiles_userId_idx" ON "hidden_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hidden_profiles_userId_hiddenUserId_key" ON "hidden_profiles"("userId", "hiddenUserId");

-- AddForeignKey
ALTER TABLE "hidden_profiles" ADD CONSTRAINT "hidden_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_profiles" ADD CONSTRAINT "hidden_profiles_hiddenUserId_fkey" FOREIGN KEY ("hiddenUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

