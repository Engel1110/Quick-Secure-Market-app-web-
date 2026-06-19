-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "imageUrl" TEXT,
    "qsmCode" TEXT NOT NULL,
    "photoHash" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "cameraRequired" BOOLEAN NOT NULL DEFAULT false,
    "resaleAllowed" BOOLEAN NOT NULL DEFAULT false,
    "previousQsmCode" TEXT,
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sellerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("category", "certified", "condition", "createdAt", "description", "id", "imageUrl", "price", "qsmCode", "sellerId", "status", "title") SELECT "category", "certified", "condition", "createdAt", "description", "id", "imageUrl", "price", "qsmCode", "sellerId", "status", "title" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_qsmCode_key" ON "Product"("qsmCode");
CREATE UNIQUE INDEX "Product_photoHash_key" ON "Product"("photoHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
