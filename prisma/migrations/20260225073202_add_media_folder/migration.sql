-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "alternativeText" TEXT,
    "caption" TEXT,
    "hash" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT '',
    "ext" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Media" ("alternativeText", "caption", "createdAt", "ext", "hash", "height", "id", "mime", "name", "size", "updatedAt", "url", "width") SELECT "alternativeText", "caption", "createdAt", "ext", "hash", "height", "id", "mime", "name", "size", "updatedAt", "url", "width" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
