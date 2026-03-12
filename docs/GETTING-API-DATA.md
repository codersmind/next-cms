# How to Get API Data

This guide shows how to fetch content from the Next-CMS API in your app or frontend.

## Base URL

- **Development:** `http://localhost:3000/api`
- **Production:** `https://your-domain.com/api`

No authentication is required for the **public content API** (list and get documents).

---

## 1. List documents (collection)

**Endpoint:** `GET /api/{pluralId}`

Replace `{pluralId}` with your content type’s plural API ID (e.g. `pages`, `articles`, `posts`).

### Example: get all published pages

```bash
GET /api/pages
```

**Response:**

```json
{
  "data": [
    {
      "id": "...",
      "documentId": "abc123...",
      "title": "Home",
      "slug": "home",
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

### JavaScript/TypeScript (fetch)

```js
const res = await fetch("http://localhost:3000/api/pages");
const json = await res.json();
const pages = json.data;
const pagination = json.meta.pagination;
```

### With query parameters

| Goal              | Example URL / params |
|-------------------|----------------------|
| Pagination        | `?page=2&pageSize=10` |
| Sort              | `?sort=createdAt:desc` or `?sort[0]=title:asc&sort[1]=createdAt:desc` |
| Filter by field   | `?filters[title][$eq]=Hello` |
| Search            | `?search=keyword` or `?_q=keyword` |
| Populate relations| `?populate=banner` or `?populate=*` |
| Fewer fields      | `?fields=title,slug,publishedAt` |

**Example: list pages, second page, 10 per page, with banner populated**

```js
const res = await fetch(
  "http://localhost:3000/api/pages?page=2&pageSize=10&populate=banner"
);
const { data, meta } = await res.json();
```

**Example: filter and sort**

```js
const params = new URLSearchParams({
  "filters[title][$containsi]": "hello",
  sort: "createdAt:desc",
  page: "1",
  pageSize: "25",
});
const res = await fetch(`http://localhost:3000/api/articles?${params}`);
```

---

## 2. Get one document

**Endpoint:** `GET /api/{pluralId}/{documentId}`

Use the **documentId** (not the numeric `id`) from the list response.

### Example: get a single page by documentId

```bash
GET /api/pages/abc123xyz...
```

**Response:**

```json
{
  "data": {
    "id": "...",
    "documentId": "abc123...",
    "title": "About",
    "slug": "about",
    "banner": { ... },
    "publishedAt": "2025-02-01T00:00:00.000Z",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "meta": {}
}
```

### JavaScript (fetch)

```js
const documentId = "abc123xyz..."; // from list or slug lookup
const res = await fetch(`http://localhost:3000/api/pages/${documentId}`);
const json = await res.json();
const page = json.data;
```

### With populate and fields

```js
// Only populate banner; limit top-level fields
const res = await fetch(
  `http://localhost:3000/api/pages/${documentId}?populate=banner&fields=title,slug,banner,publishedAt`
);
```

---

## 3. Populate (relations, media, components)

By default, relation and media fields can be returned as IDs. Use `populate` to get full objects.

| Query              | Result |
|--------------------|--------|
| `?populate=*`      | Populate all relations, media, and components. |
| `?populate=banner` | Populate only `banner`. |
| `?populate=banner&populate=author` | Populate both. |

**Select fields inside a populated field** (e.g. only `name` and `image` inside `banner`):

```
?populate[banner][fields][0]=name&populate[banner][fields][1]=image
```

**Example: pages with banner populated**

```js
const res = await fetch("http://localhost:3000/api/pages?populate=banner");
const { data } = await res.json();
// data[].banner is now an object (e.g. component with image, title), not an ID
```

---

## 4. Filters (Strapi-style)

Send filters as query params. Common operators:

| Operator   | Meaning              | Example |
|-----------|----------------------|--------|
| `$eq`     | Equals               | `filters[slug][$eq]=home` |
| `$containsi` | Contains (case-insensitive) | `filters[title][$containsi]=hello` |
| `$in`     | In list              | `filters[status][$in]=published` |
| `$gte` / `$lte` | Greater/less than or equal | `filters[publishedAt][$gte]=2025-01-01` |

**Example: page by slug**

```js
const res = await fetch(
  "http://localhost:3000/api/pages?filters[slug][$eq]=about"
);
const { data } = await res.json();
const aboutPage = Array.isArray(data) ? data[0] : null;
```

---

## 5. Next.js: server vs client

### Server (Server Components, route handlers)

Use the full URL (or `NEXT_PUBLIC_APP_URL`) so the request works from the server:

```js
const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const res = await fetch(`${base}/api/pages?populate=banner`, {
  next: { revalidate: 60 }, // optional: revalidate every 60 seconds
});
const { data } = await res.json();
```

### Client (browser)

Use a relative URL if the frontend is served from the same host as the API:

```js
const res = await fetch("/api/pages?populate=banner");
const { data } = await res.json();
```

---

## 6. Response and errors

- **200** – Success. Use `response.data` for the document(s) and `response.meta.pagination` for list pagination.
- **404** – Content type not found (wrong `pluralId`) or document not found (wrong `documentId`).

**Example: simple error handling**

```js
const res = await fetch("/api/pages/xyz");
if (!res.ok) {
  if (res.status === 404) {
    // document or content type not found
    return null;
  }
  throw new Error("Request failed");
}
const { data } = await res.json();
return data;
```

---

## Quick reference

| Action           | Method | URL |
|------------------|--------|-----|
| List documents   | GET    | `/api/{pluralId}?page=1&pageSize=25&populate=*` |
| One document     | GET    | `/api/{pluralId}/{documentId}?populate=banner` |
| Create document  | POST   | `/api/{pluralId}` with body `{ "data": { ... } }` |
| Update document  | PUT    | `/api/{pluralId}/{documentId}` with body `{ "data": { ... } }` |
| Delete document  | DELETE | `/api/{pluralId}/{documentId}` |

For full API details (filters, sort, search, admin APIs), see [API.md](./API.md).
