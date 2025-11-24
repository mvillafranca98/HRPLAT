-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "address" TEXT,
    "dni" TEXT,
    "phoneNumber" TEXT,
    "rtn" TEXT,
    "startDate" DATETIME,
    "position" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "reportsToId" TEXT,
    CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("address", "createdAt", "dni", "email", "id", "mustChangePassword", "name", "password", "phoneNumber", "position", "role", "rtn", "startDate", "updatedAt") SELECT "address", "createdAt", "dni", "email", "id", "mustChangePassword", "name", "password", "phoneNumber", "position", "role", "rtn", "startDate", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
