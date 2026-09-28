-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "rarity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "parsedName" TEXT,
    "parsedNumber" TEXT,
    "selectedCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageRetained" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceCardUrl" TEXT,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "subtype" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "itemMinor" INTEGER NOT NULL,
    "shippingMinor" INTEGER,
    "taxMinor" INTEGER,
    "location" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "available" BOOLEAN NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_catalogId_key" ON "Card"("catalogId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_cardId_fetchedAt_idx" ON "PriceSnapshot"("cardId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_cardId_source_subtype_finish_observedAt_key" ON "PriceSnapshot"("cardId", "source", "subtype", "finish", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_provider_listingId_cardId_finish_key" ON "Offer"("provider", "listingId", "cardId", "finish");

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_selectedCardId_fkey" FOREIGN KEY ("selectedCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
