# Next-CMS API Reference

Strapi-like REST API for content types, documents, admin, and uploads.

**Base URL:** `https://your-domain.com/api` (or `http://localhost:3000/api` in development)

**Authentication:** Most endpoints require a JWT. Send it in the `Authorization` header:

```http
Authorization: Bearer <your-jwt>
```

---

## Table of contents

1. [Authentication](#authentication)
2. [Content Types](#content-types)
3. [Components](#components)
4. [Content Manager (admin)](#content-manager-admin)
5. [Public content API](#public-content-api)
6. [Query parameters (list/find)](#query-parameters-listfind)
7. [Admin: Users](#admin-users)
8. [Admin: Roles](#admin-roles)
9. [Admin: Permissions](#admin-permissions)
10. [Upload](#upload)
11. [Templates](#templates)
12. [Errors](#errors)

---

## Authentication

### POST `/api/auth/login`

Log in with email/username and password. Returns a JWT and user object.

**Request**

```json
{
  "identifier": "admin@example.com",
  "password": "your-password"
}
```

- `identifier` (required): email or username  
- `password` (required)

You can also send `email` instead of `identifier`.

**Response** `200`

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clxx...",
    "email": "admin@example.com",
    "username": "admin",
    "firstname": null,
    "lastname": null
  }
}
```

**Errors**

- `400` – Missing `identifier`/`email` or `password`
- `401` – Invalid credentials or user blocked

---

## Content Types

Endpoints for managing content type schemas (Content-Type Builder). Require **authenticated user** (any logged-in user).

### GET `/api/content-types`

List all content types.

**Response** `200`

```json
[
  {
    "id": "clxx...",
    "name": "Article",
    "singularId": "article",
    "pluralId": "articles",
    "kind": "collectionType",
    "description": null,
    "draftPublish": true,
    "defaultPublicationState": "draft",
    "i18n": false,
    "attributes": [
      { "name": "title", "type": "text", "required": true },
      { "name": "slug", "type": "uid", "unique": true }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### POST `/api/content-types`

Create a content type.

**Request**

```json
{
  "name": "Article",
  "singularId": "article",
  "pluralId": "articles",
  "kind": "collectionType",
  "description": null,
  "draftPublish": false,
  "defaultPublicationState": "draft",
  "i18n": false,
  "attributes": [
    { "name": "title", "type": "text", "required": true },
    { "name": "slug", "type": "uid", "unique": true }
  ]
}
```

- `name` (required)
- `kind`: `"collectionType"` | `"singleType"` (default: `collectionType`)
- `singularId` / `pluralId`: optional; derived from `name` if omitted
- `attributes`: array of attribute definitions (required; at least `[]`)

**Response** `200` – Created content type (same shape as GET single, with `attributes` parsed).

**Errors**

- `400` – Content type with same API ID already exists
- `401` – Unauthorized

### GET `/api/content-types/[id]`

Get one content type by ID.

**Response** `200` – Single content type with `attributes` as array.

**Errors**

- `401` – Unauthorized  
- `404` – Not found

### PUT `/api/content-types/[id]`

Update a content type. Send only fields to change.

**Request** (all optional)

```json
{
  "name": "Article",
  "singularId": "article",
  "pluralId": "articles",
  "kind": "collectionType",
  "description": null,
  "draftPublish": true,
  "defaultPublicationState": "published",
  "i18n": false,
  "attributes": [ ... ]
}
```

**Response** `200` – Updated content type.

**Errors**

- `401` – Unauthorized  
- `404` – Not found

### DELETE `/api/content-types/[id]`

Delete a content type (schema only; documents remain in DB).

**Response** `200` – `{ "success": true }`

**Errors**

- `401` – Unauthorized

---

## Components

Reusable component schemas for content types. Require **authenticated user**.

### GET `/api/content-types/components`

List all components.

**Response** `200` – Array of components; each has `attributes` parsed from JSON.

### POST `/api/content-types/components`

Create a component.

**Request**

```json
{
  "name": "Seo",
  "category": "shared",
  "icon": null,
  "attributes": [
    { "name": "metaTitle", "type": "text" },
    { "name": "metaDescription", "type": "text" }
  ]
}
```

- `name` (required)  
- `category` (required, e.g. `"shared"`)  
- `icon`: optional  
- `attributes`: array (required)

**Response** `200` – Created component.

### GET `/api/content-types/components/[id]`

Get one component by ID.

**Response** `200` – Single component.

### PUT `/api/content-types/components/[id]`

Update a component. Partial body allowed.

**Request** (all optional)

```json
{
  "name": "Seo",
  "category": "shared",
  "icon": null,
  "attributes": [ ... ]
}
```

**Response** `200` – Updated component.

---

## Content Manager (admin)

Admin document API: **permission-based**. User must have the right action for the content type (e.g. `api::articles.articles.find`, `create`, `findOne`, `update`, `delete`). Use query param `contentType` to specify the collection/single type.

### GET `/api/content-manager/documents`

List documents (preview: includes draft/scheduled). Respects permissions per content type.

**Query**

- **`contentType`** (required): plural API ID, e.g. `articles`
- All [query parameters](#query-parameters-listfind): `filters`, `sort`, `pagination`, `populate`, `fields`, `status`, `search`, `searchField`

**Response** `200`

```json
{
  "data": [
    {
      "id": "...",
      "documentId": "abc123...",
      "title": "My post",
      "slug": "my-post",
      "publishedAt": "2025-02-01T00:00:00.000Z",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 2,
      "total": 40
    }
  }
}
```

**Errors**

- `400` – Missing `contentType`  
- `401` – Unauthorized  
- `403` – Forbidden (no find permission)  
- `404` – Content type not found

### POST `/api/content-manager/documents`

Create a document. Requires create permission for the content type.

**Request**

```json
{
  "contentType": "articles",
  "data": {
    "title": "Hello",
    "slug": "hello",
    "body": "..."
  },
  "publishedAt": null
}
```

- `contentType` (required): plural ID  
- `data`: document fields (required; can be `{}`)  
- `publishedAt`: `null` (draft), ISO date string (publish at that time), or omit to use content type default

**Response** `200` – `{ "data": { ... }, "meta": {} }`

**Errors**

- `400` – Missing `contentType`, invalid body, create failed, or **unique constraint** (`{ "error": "...", "field": "slug" }`)
- `401` – Unauthorized  
- `403` – Forbidden

### GET `/api/content-manager/documents/[documentId]`

Get one document. Query: `contentType` (required). Optional: `populate`, `fields`.

**Response** `200` – `{ "data": { ... }, "meta": {} }`

**Errors**

- `400` – Missing `contentType`  
- `401` – Unauthorized  
- `403` – Forbidden  
- `404` – Document not found

### PUT `/api/content-manager/documents/[documentId]`

Update a document. Query: `contentType` (required).

**Request**

```json
{
  "data": {
    "title": "Updated title",
    "slug": "updated-slug"
  },
  "publishedAt": null
}
```

- `data`: fields to merge (partial update)  
- `publishedAt`: optional; set to `null` for draft, or ISO string for publish

**Response** `200` – `{ "data": { ... }, "meta": {} }`

**Errors**

- `400` – Unique constraint violation (`error`, `field`)  
- `401` – Unauthorized  
- `403` – Forbidden  
- `404` – Document not found or update failed

### DELETE `/api/content-manager/documents/[documentId]`

Delete a document. Query: `contentType` (required).

**Response** `204` No Content

**Errors**

- `400` – Missing `contentType`  
- `401` – Unauthorized  
- `403` – Forbidden  
- `404` – Not found

---

## Public content API

REST API for content by **pluralId**. No auth required. Used for front-end / public access. Respects **publication state**: by default only **published** entries are returned (`publishedAt <= now`).

**Media links:** List and single-document GETs default to `populate=*`, so relation and **media** fields are resolved. Media objects include an absolute **`url`** (e.g. `https://your-domain.com/api/upload/files/2025/02/abc.jpg`) so you can use them directly in `<img src="...">` or links. The base URL is taken from the request origin or `NEXT_PUBLIC_APP_URL` if set.

**Reserved pluralIds** (return 404): `auth`, `upload`, `content-types`, `content-manager`, `users`, `roles`, `permissions`, `media`, `admin`

### GET `/api/[pluralId]`

List documents (e.g. `GET /api/articles`). Only published by default.

**Query**

- All [query parameters](#query-parameters-listfind); notably:
  - `publicationState`: `live` (default) | `preview`  
  - No `status` filter on this API (public always uses live by default)

**Response** `200` – Same shape as Content Manager list: `{ "data": [ ... ], "meta": { "pagination": { ... } } }`

**Errors**

- `404` – Reserved pluralId or content type not found

### POST `/api/[pluralId]`

Create a document (e.g. `POST /api/articles`). Body: `{ "data": { ... } }` or just `{ ... }`.

**Response** `200` – `{ "data": { ... }, "meta": {} }`

**Errors**

- `400` – Create failed (e.g. single type already exists) or unique constraint  
- `404` – Content type not found

### GET `/api/[pluralId]/[documentId]`

Get one document.

**Query** – Optional: `populate`, `fields`

**Response** `200` – `{ "data": { ... }, "meta": {} }`

**Errors**

- `404` – Not found

### PUT `/api/[pluralId]/[documentId]`

Update a document. Body: `{ "data": { ... } }` or `{ ... }`.

**Response** `200` – `{ "data": { ... }, "meta": {} }`

**Errors**

- `400` – Unique constraint  
- `404` – Not found

### DELETE `/api/[pluralId]/[documentId]`

Delete a document.

**Response** `204` No Content

**Errors**

- `404` – Not found

---

## Query parameters (list/find)

Used by **GET list** endpoints: Content Manager documents and public `GET /api/[pluralId]`.

| Parameter           | Type   | Description |
|--------------------|--------|-------------|
| `filters`          | object | Strapi-like filters, e.g. `{ "title": { "$containsi": "hello" } }` or JSON string |
| `sort`             | string / array | Sort field(s), e.g. `createdAt:desc` or `["title:asc","createdAt:desc"]` |
| `page`             | number | Page number (default: 1) |
| `pageSize`         | number | Page size (default: 25, max: 100) |
| `pagination[page]` | number | Same as `page` |
| `pagination[pageSize]` | number | Same as `pageSize` |
| `populate`         | string / array / object | Relations/components to populate. Use `*` or `populate=banner` or `populate[]=banner&populate[]=author`. To **select fields** inside a relation/component use object form: `populate[banner][fields][0]=name&populate[banner][fields][1]=image` (only returns `name` and `image` inside `banner`). |
| `fields`           | string / array | Top-level fields to return, e.g. `title,banner` or `fields[0]=title&fields[1]=banner` |
| `publicationState` | string | `live` \| `preview` (Content Manager uses preview) |
| `status`           | string | (Content Manager only) `draft` \| `published` \| `scheduled` |
| `_q` / `search` / `q` | string | Full-text search (in text-like fields) |
| `searchField`      | string | Field to search in (optional) |

### Populate and field selection

**Populate** controls which relations, media, and components are expanded (resolved) in the response. Unpopulated relation/media fields stay as IDs.

| Example | Effect |
|--------|--------|
| `?populate=*` | Populate everything (all relations, media, components). |
| `?populate=banner` | Populate only the `banner` field (e.g. component or relation). |
| `?populate=banner&populate=author` | Populate both `banner` and `author`. |
| `?populate[banner]=*` | Same as `populate=banner`; use object form when adding options below. |

**Select fields inside a populated relation/component** so the response only includes certain sub-fields:

| Example | Effect |
|--------|--------|
| `?populate[banner][fields][0]=name` | Populate `banner` but only return the `name` field inside it. |
| `?populate[banner][fields][0]=name&populate[banner][fields][1]=image` | Populate `banner` and only return `name` and `image` inside it. |

**Fields** (top-level) limits which root-level keys are returned (e.g. `?fields=title,slug,banner`). Use bracket form for multiple: `?fields[0]=title&fields[1]=banner`.

---

## Admin: Users

Require **authenticated user**.

### GET `/api/admin/users`

List users with pagination and filters.

**Query**

- `page` (default: 1)  
- `pageSize` (default: 25, max: 100)  
- `search` – search in email, username, firstname, lastname  
- `sort` – e.g. `createdAt:desc` (default), `email:asc`, `username`, `firstname`, `lastname`, `blocked`  
- `roleId` – filter by role  
- `blocked` – `true` | `false`

**Response** `200`

```json
{
  "data": [
    {
      "id": "...",
      "email": "user@example.com",
      "username": "user",
      "firstname": null,
      "lastname": null,
      "blocked": false,
      "roleId": "...",
      "roleName": "Editor",
      "createdAt": "..."
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 10
    }
  }
}
```

### POST `/api/admin/users`

Create a user.

**Request**

```json
{
  "email": "new@example.com",
  "password": "secret",
  "username": "newuser",
  "firstname": "New",
  "lastname": "User",
  "roleId": "clxx..."
}
```

- `email` (required)  
- `password` (required)  
- `username`, `firstname`, `lastname`, `roleId` optional

**Response** `200` – Created user (no password in response).

**Errors**

- `400` – Email/username already in use, or missing email/password

### GET `/api/admin/users/[id]`

Get one user.

**Response** `200` – User object (no password).

### PATCH `/api/admin/users/[id]`

Update a user. Send only fields to change.

**Request** (all optional)

```json
{
  "email": "updated@example.com",
  "username": "updated",
  "password": "newpassword",
  "firstname": "First",
  "lastname": "Last",
  "blocked": false,
  "roleId": "clxx..." 
}
```

**Response** `200` – Updated user.

**Errors**

- `400` – Email/username already in use  
- `404` – Not found

### DELETE `/api/admin/users/[id]`

Delete a user.

**Response** `204` No Content

**Errors**

- `404` – Not found

---

## Admin: Roles

Require **authenticated user**.

### GET `/api/admin/roles`

List all roles with `usersCount` and `permissionsCount`.

**Response** `200` – Array of roles.

### POST `/api/admin/roles`

Create a role.

**Request**

```json
{
  "name": "Editor",
  "description": "Can edit content",
  "type": "custom"
}
```

- `name` (required)  
- `description`, `type` optional

**Response** `200` – Created role.

**Errors**

- `400` – Role name already exists

### GET `/api/admin/roles/[id]`

Get one role with `usersCount` and `permissionsCount`.

**Response** `200` – Role object.

### PATCH `/api/admin/roles/[id]`

Update a role. Body: `{ "name"?, "description"?, "type"? }`.

**Response** `200` – Updated role.

**Errors**

- `400` – Role name already exists  
- `404` – Not found

### DELETE `/api/admin/roles/[id]`

Delete a role.

**Response** `204` No Content

**Errors**

- `404` – Not found

---

## Admin: Permissions

Require **authenticated user**.

### GET `/api/admin/permissions`

List permissions. Optional query: `roleId` to filter by role.

**Response** `200` – Array of permissions (with `role` when no `roleId` filter).

### POST `/api/admin/permissions`

Create or update a permission (upsert by `roleId` + `action`).

**Request**

```json
{
  "roleId": "clxx...",
  "action": "api::articles.articles.find",
  "enabled": true
}
```

- `roleId` (required)  
- `action` (required), e.g. `api::articles.articles.find`, `create`, `findOne`, `update`, `delete`  
- `enabled` (default: true)

**Response** `200` – Permission object.

**Errors**

- `400` – Missing roleId or action  
- `404` – Role not found

### PATCH `/api/admin/permissions/[id]`

Update a permission. Body: `{ "enabled": true | false }`.

**Response** `200` – Updated permission.

**Errors**

- `404` – Not found

### DELETE `/api/admin/permissions/[id]`

Delete a permission.

**Response** `204` No Content

**Errors**

- `404` – Not found

---

## Upload

Require **authenticated user**.

### POST `/api/upload`

Upload a file. `multipart/form-data`.

**Form fields**

- `files` | `file` | `files[]` – the file (required)  
- `folder` – optional subfolder (e.g. `2025/02`); default is `YYYY/MM`

**Response** `200`

```json
[
  {
    "id": "...",
    "name": "image.jpg",
    "hash": "abc123.jpg",
    "folder": "2025/02",
    "ext": ".jpg",
    "mime": "image/jpeg",
    "size": 12345,
    "url": "/api/upload/files/2025/02/abc123.jpg",
    "width": null,
    "height": null
  }
]
```

**Errors**

- `400` – No file  
- `401` – Unauthorized  
- `500` – Disk or DB error

### GET `/api/upload`

List uploaded files. Optional query: `page`, `pageSize`, `search`, `filter` (`all` | `images`), `folder`.  
If `page` and `pageSize` are omitted, returns a plain array; otherwise returns `{ "data": [ ... ], "meta": { "pagination": { ... } } }`.

**Response** `200` – Array or paginated object.

---

## Templates

Content type templates (pre-defined schemas). Require **authenticated user**.

### GET `/api/templates`

List all templates. Each item has `schema` parsed (e.g. `{ "kind": "collectionType", "attributes": [ ... ] }`).

**Response** `200` – Array of templates.

### POST `/api/templates`

Create a template.

**Request**

```json
{
  "name": "Blog Post",
  "description": "Standard blog post schema",
  "schema": {
    "kind": "collectionType",
    "attributes": [
      { "name": "title", "type": "text", "required": true },
      { "name": "body", "type": "richtext" }
    ]
  }
}
```

- `name` (required)  
- `description` optional  
- `schema` (required): `{ "kind", "attributes" }`

**Response** `200` – Created template with `schema` parsed.

---

## Errors

- **401 Unauthorized** – Missing or invalid JWT / not logged in.  
- **403 Forbidden** – Logged in but no permission for this action.  
- **404 Not found** – Resource or content type not found.  
- **400 Bad Request** – Validation, duplicate (e.g. unique field), or invalid body.

Unique constraint (e.g. duplicate slug):

```json
{
  "error": "Another document already has this value for \"slug\".",
  "field": "slug"
}
```

All error responses are JSON `{ "error": "message" }` unless noted (e.g. Content type not found may include `data: null`).
