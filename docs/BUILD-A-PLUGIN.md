# Build a Custom Plugin for Next-CMS

This guide explains how anyone can build and install a **custom plugin** for Next-CMS without changing the core codebase. You package your plugin as a **ZIP file** with a fixed folder structure. After upload, it appears in the admin sidebar and runs its own pages.

---

## What you can build

| Goal | How |
|------|-----|
| New admin menu + settings screen | `settings` page + `plugin.json` |
| Store plugin data (templates, logs, API keys) | `collection` page |
| Send email from admin | `email-send` page + `email` capability |
| Custom HTML UI | `html` page + `admin/index.html` |
| Connect to external APIs | `settings` for keys + `collection` or custom `index.html` calling Plugin API |

Plugins do **not** upload executable server code. They use **declarative JSON** (safe and predictable). For advanced server logic, extend the CMS source code separately.

---

## Full example plugin (recommended)

Before building from scratch, install and explore **Demo Suite** in the repo:

| Item | Path |
|------|------|
| Plugin folder | `plugins/demo-suite/` |
| Walkthrough | [EXAMPLE-DEMO-SUITE.md](./EXAMPLE-DEMO-SUITE.md) |
| In admin | **Demo Suite** sidebar → **Guide** tab |

It includes every page type, a custom HTML API dashboard, two automations, and a step-by-step README.

---

## Quick start (5 minutes)

### 1. Create a folder

```text
hello-plugin/
  plugin.json
  admin/
    pages.json
  README.md
```

### 2. Add `plugin.json`

```json
{
  "id": "hello-plugin",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "description": "My first Next-CMS plugin",
  "author": "Your Name",
  "permissions": ["plugin.hello-plugin.use"],
  "capabilities": ["storage"],
  "admin": {
    "menu": {
      "label": "Hello",
      "icon": "puzzle",
      "order": 90
    },
    "pages": []
  }
}
```

| Field | Rules |
|-------|--------|
| `id` | Lowercase letters, numbers, hyphens only. Starts with a letter. Example: `order-sync` |
| `permissions` | Use `plugin.{id}.use` — assign to roles in Admin → Permissions |
| `capabilities` | `storage` = save data via Plugin API; `email` = send mail; `settings` = config forms |
| `admin.menu.icon` | `puzzle` or `mail` (shown in sidebar) |
| `admin.pages` | Leave `[]` if you use `admin/pages.json` |

### 3. Add `admin/pages.json`

```json
{
  "pages": [
    {
      "slug": "",
      "title": "Welcome",
      "type": "readme"
    },
    {
      "slug": "notes",
      "title": "Notes",
      "type": "collection",
      "collection": "notes",
      "fields": [
        { "name": "name", "label": "Title", "type": "text" },
        { "name": "body", "label": "Content", "type": "textarea" }
      ]
    }
  ]
}
```

### 4. Add `README.md` (optional)

Markdown shown on the **readme** page:

```markdown
# Hello Plugin

This plugin stores short notes in the CMS database.

Install, open **Hello** in the sidebar, then use the **Notes** tab.
```

### 5. Zip and install

1. Zip the `hello-plugin` folder (so the ZIP contains `hello-plugin/plugin.json`, not loose files at the root).
2. Log in to Next-CMS admin.
3. Go to **Plugins** → **Upload plugin ZIP**.
4. Open **Hello** in the sidebar.

**URLs after install:**

- Overview: `/admin/plugins/hello-plugin`
- Notes: `/admin/plugins/hello-plugin/notes`

---

## ZIP structure (required layout)

```text
your-plugin-id/
  plugin.json              REQUIRED — manifest
  admin/
    pages.json             RECOMMENDED — admin screens
    index.html             OPTIONAL — only if you use type "html"
  README.md                OPTIONAL — overview text
  assets/                  OPTIONAL — images, CSS (serve via assets API)
```

### Valid ZIP formats

**Option A — folder inside ZIP (recommended):**

```text
hello-plugin.zip
  └── hello-plugin/
        plugin.json
        admin/pages.json
```

**Option B — files at ZIP root:**

```text
hello-plugin.zip
  plugin.json
  admin/pages.json
```

Both work. Max size: **15 MB**.

---

## `plugin.json` reference

```json
{
  "id": "my-plugin",
  "name": "Human readable name",
  "version": "1.0.0",
  "description": "Short description in Plugins list",
  "author": "Company or person",
  "minCmsVersion": "0.1.0",
  "permissions": ["plugin.my-plugin.use"],
  "capabilities": ["storage", "settings", "email"],
  "admin": {
    "menu": {
      "label": "Sidebar label",
      "icon": "puzzle",
      "order": 50
    },
    "pages": []
  },
  "settings": {
    "api": {
      "label": "API connection",
      "fields": [
        { "name": "baseUrl", "label": "Base URL", "type": "text", "required": true },
        { "name": "apiKey", "label": "API Key", "type": "text" }
      ]
    }
  }
}
```

### Settings blocks

Each key under `settings` (e.g. `api`, `smtp`) maps to a **settings** page via `settingsKey`:

```json
{
  "slug": "api",
  "title": "API connection",
  "type": "settings",
  "settingsKey": "api"
}
```

Field `type` in manifest is always `"text"` in the form (password fields use name `pass`).

Saved data is stored in collection `settings` with key = `settingsKey`.

---

## Admin page types (`admin/pages.json`)

Each page becomes a tab in the plugin UI.

| `type` | Purpose | Extra fields |
|--------|---------|----------------|
| `readme` | Show `README.md` + intro | — |
| `settings` | Config form from `plugin.json` → `settings` | `settingsKey` |
| `collection` | List / add / edit / delete records | `collection`, `fields` |
| `email-send` | Send email UI | Requires `email` in capabilities + SMTP settings |
| `html` | Embed custom HTML | `htmlFile` (default `index.html`) |

### `slug` and URLs

| slug in JSON | Admin URL |
|--------------|-----------|
| `""` | `/admin/plugins/{id}` |
| `"settings"` | `/admin/plugins/{id}/settings` |
| `"templates"` | `/admin/plugins/{id}/templates` |

`title` = tab label in the plugin navigation.

### Field types — where to use which

There are **two different places** for fields. Do not mix them up.

#### A) Collection pages (`admin/pages.json` → `"type": "collection"`)

Only these three values are supported for `fields[].type`:

| `type` | When to use | Admin UI | Stored as |
|--------|-------------|----------|-----------|
| `text` | Short values: ID, title, email, status, number as string | Single-line input | String |
| `textarea` | Long plain text: notes, log message, JSON as text | Tall text box (no formatting) | String |
| `richtext` | HTML content: email body, article snippet | Tall text box (you type/paste HTML) | String (HTML) |

**Examples:**

```json
"fields": [
  { "name": "orderId", "label": "Order ID", "type": "text" },
  { "name": "message", "label": "Log message", "type": "textarea" },
  { "name": "emailHtml", "label": "Email HTML", "type": "richtext" }
]
```

Anything else (`number`, `boolean`, `date`, `select`, …) is **not** supported yet — use `text` and validate in your app, or store JSON inside a `textarea`.

`name` = field key saved in plugin storage (use English, no spaces: `orderId`, not `Order ID`).

---

#### B) Settings pages (`plugin.json` → `"settings"` + page `"type": "settings"`)

Defined under `plugin.json` → `settings` → `{key}` → `fields`:

| `type` in manifest | UI |
|--------------------|-----|
| `"text"` | Single-line input (default for all settings fields) |

Special case: if `name` is `pass` or `password`, the input is **masked** (password field).

```json
"settings": {
  "connection": {
    "label": "API",
    "fields": [
      { "name": "endpoint", "label": "API URL", "type": "text", "required": true },
      { "name": "apiKey", "label": "Secret key", "type": "text" }
    ]
  }
}
```

Settings do **not** use `textarea` / `richtext` in the manifest today.

---

#### Quick decision guide

| You need… | Use |
|-----------|-----|
| One line (ID, name, status) | `text` |
| Many lines, plain text | `textarea` |
| HTML email / rich content | `richtext` |
| Plugin config (API URL, token) | `settings` in `plugin.json` with `type: "text"` |
| Dropdown / number / date | Not built-in — use `text` or custom `html` page |

---

Each collection item is stored with a **key** (often derived from the `name` field when you save). The list shows `name` or the storage key in the admin UI.

---

## Example: Order status plugin (no email)

Use case: webhook or manual tool updates order status — store sync log in the plugin.

**plugin.json:**

```json
{
  "id": "order-sync",
  "name": "Order Sync",
  "version": "1.0.0",
  "description": "Log order sync events",
  "permissions": ["plugin.order-sync.use"],
  "capabilities": ["storage", "settings"],
  "admin": {
    "menu": { "label": "Order Sync", "icon": "puzzle", "order": 70 },
    "pages": []
  },
  "settings": {
    "connection": {
      "label": "External API",
      "fields": [
        { "name": "endpoint", "label": "API URL", "type": "text", "required": true },
        { "name": "token", "label": "Token", "type": "text" }
      ]
    }
  }
}
```

**admin/pages.json:**

```json
{
  "pages": [
    { "slug": "", "title": "Overview", "type": "readme" },
    {
      "slug": "connection",
      "title": "Connection",
      "type": "settings",
      "settingsKey": "connection"
    },
    {
      "slug": "logs",
      "title": "Sync logs",
      "type": "collection",
      "collection": "logs",
      "fields": [
        { "name": "name", "label": "Order ID", "type": "text" },
        { "name": "body", "label": "Message", "type": "textarea" }
      ]
    }
  ]
}
```

---

## Example: Email plugin (full reference)

The bundled **Mail Sender** plugin is a complete example in the repo:

```text
plugins/mail-sender/
  plugin.json
  admin/pages.json
  README.md
```

Copy this folder, rename `id` and files, and adjust pages for your use case.

Capabilities needed for sending mail:

```json
"capabilities": ["email", "storage", "settings"]
```

SMTP is configured on the **SMTP settings** page (`settingsKey: "smtp"`). Templates use a `collection` named `templates`.

---

## Custom HTML page (`type: html`)

For a fully custom admin UI:

1. Add `admin/index.html` to your plugin.
2. Add a page:

```json
{
  "slug": "app",
  "title": "Dashboard",
  "type": "html",
  "htmlFile": "index.html"
}
```

3. The page loads in an iframe from:

   `/api/plugins/{plugin-id}/assets/admin/index.html`

### Calling Plugin API from HTML (advanced)

Your HTML runs in the browser. Call the CMS with the same JWT as admin (`localStorage.getItem("jwt")`):

```javascript
const token = localStorage.getItem("jwt");

// List records
const list = await fetch("/api/plugins/hello-plugin/data?collection=notes", {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// Save record
await fetch("/api/plugins/hello-plugin/data", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    collection: "notes",
    key: "my-note-1",
    value: { name: "Hello", body: "World" },
  }),
});
```

```javascript
// Send email (plugin must have email capability)
await fetch("/api/plugins/mail-sender/send-email", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: "user@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  }),
});
```

---

## Using Vite (React, Vue, Svelte) in a plugin

**The CMS does not run Vite when you upload a ZIP.** Upload only ships **static files** (HTML, JS, CSS, images). That is intentional: no Node build step on the server.

You **can** use Vite on your machine, then zip the **build output** and upload it here (Admin → Plugins → Upload plugin ZIP).

### Example in this repo: `vite-todo`

A complete **React + Vite TODO app** plugin:

| Path | Purpose |
|------|---------|
| `plugins/vite-todo/vite-admin/` | Source (`npm run dev` / `npm run build`) |
| `plugins/vite-todo/admin/app/` | Build output (committed so it works without building) |
| `plugins/vite-todo/admin/pages.json` | Admin tabs (not overwritten by Vite) |

Enable **Vite Todo** in Admin → Plugins → open **Todo app** tab.

### Workflow

```text
1. Develop UI with Vite (npm run dev)
2. npm run build  →  outputs to plugin folder (e.g. admin/)
3. Zip my-plugin/ (plugin.json + admin/index.html + admin/assets/*)
4. Upload ZIP in Admin → Plugins
5. Admin opens type: "html" tab → iframe loads your built index.html
```

### `vite.config.ts` (important: `base` path)

The admin iframe loads your page from:

`/api/plugins/{your-plugin-id}/assets/admin/index.html`

Set Vite `base` so JS/CSS URLs resolve under that path:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const pluginId = "my-plugin";

export default defineConfig({
  plugins: [react()],
  // Match iframe URL: /api/plugins/{id}/assets/admin/app/index.html
  base: `/api/plugins/${pluginId}/assets/admin/app/`,
  build: {
    outDir: path.resolve(__dirname, "../admin/app"),
    emptyOutDir: true,
  },
});
```

Build into `admin/app/` so Vite does not delete `admin/pages.json`:

```text
my-plugin/
  plugin.json
  admin/
    pages.json          ← keep outside Vite outDir
    app/                ← Vite build output
      index.html
      assets/
        index-*.js
        index-*.css
  vite-admin/           ← source (optional in ZIP; omit node_modules)
```

`pages.json`:

```json
{ "type": "html", "htmlFile": "app/index.html" }
```

Copy `plugins/vite-todo/vite-admin/` as a starter.

### `pages.json`

```json
{
  "slug": "app",
  "title": "My app",
  "type": "html",
  "htmlFile": "index.html"
}
```

### Calling the CMS from Vite code

Use the same origin and admin JWT:

```ts
const token = localStorage.getItem("jwt");

await fetch(`/api/plugins/${pluginId}/data?collection=items`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

Do **not** commit `node_modules` into the ZIP. Only `plugin.json`, `README.md`, `admin/pages.json`, and **built** `admin/**` files.

### Iframe height (no inner scrollbar)

HTML plugins load in an iframe. The CMS auto-sizes the iframe to your content and hides the inner scrollbar. From your Vite app, notify the parent after render:

```ts
window.parent.postMessage(
  { type: "next-cms-plugin-resize", height: document.documentElement.scrollHeight },
  window.location.origin
);
```

See `plugins/vite-todo/vite-admin/src/iframeResize.ts`. Use `html, body { overflow: hidden }` in your CSS.

### Limits

| Rule | Detail |
|------|--------|
| ZIP size | Max **15 MB** (include only `dist` / build output, not source) |
| Server code | No — only static assets + declarative JSON |
| Hot reload in CMS | No — rebuild and re-upload (or copy files into `plugins/` in dev) |

### Dev tip (local CMS repo)

While developing, you can skip ZIP and copy build output straight into `plugins/my-plugin/admin/`, then refresh the plugin admin tab. Visit **Admin → Plugins** once to refresh the manifest from disk.

---

## Plugin HTTP API summary

Base URL: your site origin (e.g. `http://localhost:3000`).

All requests need header:

```http
Authorization: Bearer <admin-jwt>
```

| Method | Path | Body / query |
|--------|------|----------------|
| GET | `/api/plugins/{id}/data?collection=name` | List items |
| POST | `/api/plugins/{id}/data` | `{ "collection", "key", "value" }` |
| DELETE | `/api/plugins/{id}/data?collection=name&key=item-key` | Remove item |
| POST | `/api/plugins/{id}/send-email` | `{ "to", "subject", "html", "text?" }` |
| GET | `/api/plugins/{id}/assets/path/to/file` | Static files |

---

## Install & manage

### Upload (admin UI)

1. **Admin → Plugins → Upload plugin ZIP**
2. Plugin appears in the list and sidebar (if enabled).

### Manual install (developers)

1. Unzip into `plugins/{plugin-id}/` at project root.
2. Open **Admin → Plugins** — bundled folders auto-register.

### Environment

```env
PLUGINS_DIR=./plugins
```

### Enable / disable / uninstall

- **Plugins** list → power icon = enable/disable  
- Trash = uninstall (removes files and database rows)

---

## Permissions

| Permission | Meaning |
|------------|---------|
| `admin.plugins` | Upload, enable, disable, uninstall plugins |
| `plugin.{your-id}.use` | Open plugin pages and use Plugin API |

**Super Admin** has all permissions. For other roles, add `plugin.{id}.use` in **Admin → Permissions**.

---

## Checklist before publishing your plugin

- [ ] `id` is unique and matches folder name
- [ ] `plugin.json` is valid JSON
- [ ] `admin/pages.json` has at least one page
- [ ] `permissions` includes `plugin.{id}.use`
- [ ] `capabilities` match features you use (`email` only if you use send-email)
- [ ] ZIP tested on a clean CMS install
- [ ] README explains what the plugin does

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Upload fails | Check ZIP contains `plugin.json`; id must be lowercase |
| Plugin not in sidebar | Enable it in Plugins list; check `enabled` |
| 403 Forbidden | Add `plugin.{id}.use` to user role |
| Settings not saving | `settingsKey` must match a key in `plugin.json` → `settings` |
| Email send fails | Configure SMTP on settings page; need `email` capability |
| Pages empty | Use `admin/pages.json` or set `admin.pages` in manifest |

---

## Automations (dynamic — defined in your plugin)

Each plugin ships its own behavior in **`plugin.json` → `automations`**. The CMS does **not** hardcode plugin names, template keys, or email copy.

```json
{
  "id": "my-mailer",
  "capabilities": ["email", "storage", "settings"],
  "automations": [
    {
      "id": "send-email-on-entry-create",
      "label": "Send email when a content entry is created",
      "description": "Connect to outbound webhook entry.create. Set templateKey to a template key you created in this plugin admin.",
      "trigger": {
        "event": "entry.create",
        "contentTypes": []
      },
      "action": {
        "handler": "plugin.sendEmail",
        "options": {
          "toPath": "entry.email",
          "templateCollection": "templates",
          "templateKey": "your-template-key",
          "subject": "Thank you, {{entry.name}}",
          "html": "<p>Hello {{entry.name}}</p>"
        }
      }
    }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `automations[].id` | Unique id within this plugin |
| `trigger.event` | Suggested outbound webhook event |
| `trigger.contentTypes` | Optional hints (empty = you choose in Webhooks admin) |
| `action.handler` | CMS handler name (`plugin.sendEmail`, `document.updateOnMatch`, …) |
| `action.options` | Passed to handler; **`pluginId` is added automatically** when the automation runs |

After install, open **Webhooks → inbound → Load action from installed plugin** and pick your plugin automation. Edit handler JSON (template key, paths) for your site.

The plugin admin UI lists **Automations** from the manifest when present.

### Example: public form → confirmation email

1. **Content-Type Builder** — e.g. `register-forms` with `name`, `email`. **Public** role → **create**.
2. **Your email plugin** — SMTP settings + **templates** collection (any keys you define).
3. **`automations`** in your plugin JSON (see above). Use `{{entry.name}}`, `{{entry.email}}` in subject/html.
4. **Webhooks → inbound** — load automation from your plugin; set `templateKey` to a template you created.
5. **Webhooks → outbound** — `entry.create`, your content type, URL = inbound receive URL, header `x-webhook-secret`.

```http
POST /api/register-forms
Content-Type: application/json

{ "data": { "name": "Jane", "email": "jane@example.com" } }
```

### `plugin.sendEmail` options (in your automation)

| Option | Meaning |
|--------|---------|
| `toPath` | Dot path to recipient (default `entry.email`) |
| `templateKey` | Key in plugin `templates` collection |
| `templateCollection` | Collection name (default `templates`) |
| `subject` / `html` | Static or `{{entry.field}}` placeholders |
| `subjectPath` / `htmlPath` | Read subject/html from webhook payload |

### Other patterns

| Requirement | Approach |
|---------------|----------|
| Email on entry events | `automations` + `plugin.sendEmail` + webhooks |
| Update document from external POST | `document.updateOnMatch` in `automations` or inbound actions |
| Custom admin UI | `type: "html"` + Plugin API |
| External CRM | Outbound webhook URL to your service |

---

## Custom admin pages (any UI you need)

| `type` in `admin/pages.json` | What you get |
|------------------------------|--------------|
| `readme` | Markdown docs |
| `settings` | Config forms (API keys, SMTP, etc.) |
| `collection` | CRUD tables (templates, logs, rules) |
| `email-send` | Manual send test UI |
| `html` | Full custom page (`admin/index.html`) — dashboards, wizards, charts |

Example **html** page:

```json
{
  "slug": "dashboard",
  "title": "My dashboard",
  "type": "html",
  "htmlFile": "index.html"
}
```

Build any UI in HTML/JS; call `/api/plugins/{your-id}/data` and `/api/plugins/{your-id}/send-email` (if `email` capability) with the admin JWT. For **automatic** reactions to public API writes, use **`automations`** + **webhooks**, not only the plugin admin UI.

---

## What plugins cannot do (today)

- Run custom Node.js / PHP from the ZIP on the server  
- Add new core API routes automatically without CMS update  
- Replace built-in Content Manager or Content-Type Builder  

For automatic email, declare **`automations`** in your plugin and connect them in **Webhooks** (see [Automations](#automations-dynamic--defined-in-your-plugin)). For other server logic, contribute to the CMS or use an external service.

---

## Related docs

- [PLUGINS.md](./PLUGINS.md) — short technical reference  
- [API.md](./API.md) — main CMS REST API  
- Full example: `plugins/demo-suite/` — [EXAMPLE-DEMO-SUITE.md](./EXAMPLE-DEMO-SUITE.md)
- Email-only example: `plugins/mail-sender/`

---

## Versioning

Bump `version` in `plugin.json` when you release an update. Re-upload the ZIP; the CMS overwrites the installed files and updates metadata.

Use semantic versioning when possible: `1.0.0` → `1.1.0` (features) → `2.0.0` (breaking manifest changes).
