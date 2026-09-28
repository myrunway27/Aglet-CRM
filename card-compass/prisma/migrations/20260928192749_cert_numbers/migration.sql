-- AlterTable
ALTER TABLE "CollectionItem" ADD COLUMN     "certNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_userId_grader_certNumber_key" ON "CollectionItem"("userId", "grader", "certNumber");

