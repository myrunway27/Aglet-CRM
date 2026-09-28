-- AlterTable
ALTER TABLE "CollectionItem" ADD COLUMN     "binderId" TEXT,
ADD COLUMN     "setId" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Binder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Binder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "targetMinor" INTEGER,
    "targetCurrency" TEXT,
    "alertId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Binder_userId_name_key" ON "Binder"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_catalogId_finish_key" ON "WishlistItem"("userId", "catalogId", "finish");

-- CreateIndex
CREATE INDEX "CollectionItem_userId_setId_idx" ON "CollectionItem"("userId", "setId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_observedAt_subtype_idx" ON "PriceSnapshot"("observedAt", "subtype");

-- AddForeignKey
ALTER TABLE "Binder" ADD CONSTRAINT "Binder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "Binder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill set ids from catalog ids ("{setId}-{number}", the Pokémon TCG API id format).
UPDATE "CollectionItem" SET "setId" = regexp_replace("catalogId", '-[^-]+$', '') WHERE "setId" = '';
