import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "Super Admin" },
    create: {
      name: "Super Admin",
      description: "Full access",
      type: "custom",
    },
    update: {},
  });

  const authenticatedRole = await prisma.role.upsert({
    where: { name: "Authenticated" },
    create: {
      name: "Authenticated",
      description: "Logged-in users",
      type: "authenticated",
    },
    update: {},
  });

  const publicRole = await prisma.role.upsert({
    where: { name: "Public" },
    create: {
      name: "Public",
      description: "Anonymous",
      type: "public",
    },
    update: {},
  });

  const adminPassword = await bcrypt.hash("Admin123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@localhost" },
    create: {
      email: "admin@localhost",
      username: "admin",
      password: adminPassword,
      firstname: "Admin",
      lastname: "User",
      roleId: adminRole.id,
    },
    update: {},
  });

  const templates = [
    {
      name: "Blog Post",
      description: "Article with title, slug, content, cover image, and author relation",
      schema: {
        kind: "collectionType",
        displayName: "Blog Post",
        singularName: "article",
        pluralName: "articles",
        draftPublish: true,
        attributes: [
          { name: "title", type: "text", required: true },
          { name: "slug", type: "uid", attachedField: "title" },
          { name: "content", type: "richtext" },
          { name: "cover", type: "media", multiple: false },
          { name: "author", type: "relation", relation: "manyToOne", target: "author" },
        ],
      },
    },
    {
      name: "Author",
      description: "Author with name, avatar, and bio",
      schema: {
        kind: "collectionType",
        displayName: "Author",
        singularName: "author",
        pluralName: "authors",
        attributes: [
          { name: "name", type: "text", required: true },
          { name: "avatar", type: "media", multiple: false },
          { name: "bio", type: "text" },
        ],
      },
    },
    {
      name: "Product",
      description: "E-commerce product with name, price, description, images",
      schema: {
        kind: "collectionType",
        displayName: "Product",
        singularName: "product",
        pluralName: "products",
        draftPublish: true,
        attributes: [
          { name: "name", type: "text", required: true },
          { name: "slug", type: "uid", attachedField: "name" },
          { name: "price", type: "number", numberFormat: "decimal" },
          { name: "description", type: "richtext" },
          { name: "images", type: "media", multiple: true },
        ],
      },
    },
    {
      name: "Page",
      description: "Single-type style page (one entry per locale)",
      schema: {
        kind: "collectionType",
        displayName: "Page",
        singularName: "page",
        pluralName: "pages",
        draftPublish: true,
        attributes: [
          { name: "title", type: "text", required: true },
          { name: "slug", type: "uid", attachedField: "title" },
          { name: "content", type: "richtext" },
        ],
      },
    },
  ];

  for (const t of templates) {
    const existing = await prisma.contentTypeTemplate.findFirst({
      where: { name: t.name },
    });
    if (existing) {
      await prisma.contentTypeTemplate.update({
        where: { id: existing.id },
        data: { description: t.description, schema: JSON.stringify(t.schema) },
      });
    } else {
      await prisma.contentTypeTemplate.create({
        data: {
          name: t.name,
          description: t.description,
          schema: JSON.stringify(t.schema),
        },
      });
    }
  }

  console.log("Seed: admin user (admin@localhost / Admin123!), roles, and templates created.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
