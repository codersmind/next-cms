-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "singularId" TEXT NOT NULL,
    "pluralId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "draftPublish" BOOLEAN NOT NULL DEFAULT false,
    "defaultPublicationState" TEXT NOT NULL DEFAULT 'draft',
    "i18n" BOOLEAN NOT NULL DEFAULT false,
    "attributes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ContentType" ("attributes", "createdAt", "description", "draftPublish", "i18n", "id", "kind", "name", "pluralId", "singularId", "updatedAt") SELECT "attributes", "createdAt", "description", "draftPublish", "i18n", "id", "kind", "name", "pluralId", "singularId", "updatedAt" FROM "ContentType";
DROP TABLE "ContentType";
ALTER TABLE "new_ContentType" RENAME TO "ContentType";
CREATE UNIQUE INDEX "ContentType_singularId_key" ON "ContentType"("singularId");
CREATE UNIQUE INDEX "ContentType_pluralId_key" ON "ContentType"("pluralId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
