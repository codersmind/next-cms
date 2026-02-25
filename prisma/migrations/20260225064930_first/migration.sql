-- CreateTable
CREATE TABLE "ContentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "singularId" TEXT NOT NULL,
    "pluralId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "draftPublish" BOOLEAN NOT NULL DEFAULT false,
    "i18n" BOOLEAN NOT NULL DEFAULT false,
    "attributes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "attributes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "contentTypeId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    CONSTRAINT "Document_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ContentType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "fromDocumentId" TEXT NOT NULL,
    "toDocumentId" TEXT NOT NULL,
    CONSTRAINT "DocumentRelation_fromDocumentId_fkey" FOREIGN KEY ("fromDocumentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentRelation_toDocumentId_fkey" FOREIGN KEY ("toDocumentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "alternativeText" TEXT,
    "caption" TEXT,
    "hash" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentTypeTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentType_singularId_key" ON "ContentType"("singularId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentType_pluralId_key" ON "ContentType"("pluralId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_documentId_key" ON "Document"("documentId");

-- CreateIndex
CREATE INDEX "DocumentRelation_fromDocumentId_fieldName_idx" ON "DocumentRelation"("fromDocumentId", "fieldName");

-- CreateIndex
CREATE INDEX "DocumentRelation_toDocumentId_idx" ON "DocumentRelation"("toDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRelation_fromDocumentId_fieldName_toDocumentId_key" ON "DocumentRelation"("fromDocumentId", "fieldName", "toDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Permission_roleId_idx" ON "Permission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_roleId_key" ON "Permission"("action", "roleId");
