-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "accessoriesIncluded" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aiAnalysis" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "batteryHealth" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brand" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "clothingDetails" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "confidenceScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" INTEGER,
ADD COLUMN     "deliveryMethod" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "dimensions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "estimatedSaleTime" TEXT NOT NULL DEFAULT 'No estimado',
ADD COLUMN     "evidence" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "evidenceRequired" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imei" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isQsmVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "lastEditedBy" INTEGER,
ADD COLUMN     "location" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "model" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "publicationLevel" TEXT NOT NULL DEFAULT 'Sin clasificar',
ADD COLUMN     "publicationScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quality" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "ramMemory" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "riskLabel" TEXT NOT NULL DEFAULT 'Riesgo por determinar',
ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saleProbability" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "serialNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "specialPriceExplanation" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "specialPriceReason" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "storageCapacity" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "vehicleDetails" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "verificationMode" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "video" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "warranty" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "condition" SET DEFAULT 'USED_GOOD';

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_category_riskLevel_status_idx" ON "Product"("category", "riskLevel", "status");

-- CreateIndex
CREATE INDEX "Product_sellerId_status_createdAt_idx" ON "Product"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_serialNumber_idx" ON "Product"("serialNumber");

-- CreateIndex
CREATE INDEX "Product_imei_idx" ON "Product"("imei");
