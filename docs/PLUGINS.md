# Plugins — Overview

Next-CMS supports **ZIP plugins** that extend the admin panel without modifying core code.

## Start here

**[BUILD-A-PLUGIN.md](./BUILD-A-PLUGIN.md)** — step-by-step guide for building and installing a custom plugin (recommended for developers and plugin authors).

## Build reference in admin

**Admin → Plugins → Build guide** — ZIP layout, example paths, and every valid **`admin.menu.icon`** name (with preview).

`GET /api/admin/plugins/meta` → `{ "menuIcons": ["bell", "boxes", ...] }`

Details: [BUILD-A-PLUGIN.md — Menu icon names](./BUILD-A-PLUGIN.md#menu-icon-names)

## At a glance

| Item | Location |
|------|----------|
| Upload plugins | Admin → **Plugins** |
| Icon name list | **Plugins → Build guide** or `/api/admin/plugins/meta` |
| **Full example (recommended)** | `plugins/demo-suite/` — all page types, HTML dashboard, automations |
| **Vite + React example** | `plugins/vite-todo/` — TODO app, build with Vite then upload |
| Email-only example | `plugins/mail-sender/` |
| Walkthrough doc | [EXAMPLE-DEMO-SUITE.md](./EXAMPLE-DEMO-SUITE.md) |
| Plugin storage | `plugins/` folder (or `PLUGINS_DIR` in `.env`) |
| Full build guide | [BUILD-A-PLUGIN.md](./BUILD-A-PLUGIN.md) |

## ZIP structure (minimum)

```text
my-plugin/
  plugin.json
  admin/pages.json
```

## Page types

`readme` · `settings` · `collection` · `email-send` · `html` (plain HTML or **Vite build output** — see [BUILD-A-PLUGIN.md — Using Vite](./BUILD-A-PLUGIN.md#using-vite-react-vue-svelte-in-a-plugin))

## Collection field types

Only **`text`**, **`textarea`**, **`richtext`** in `admin/pages.json` → `fields`.

Details: **[BUILD-A-PLUGIN.md — Field types](./BUILD-A-PLUGIN.md#field-types--where-to-use-which)**

## Security

- Max ZIP size: 15 MB  
- Declarative JSON only (no uploaded server scripts)  
- Permissions: `admin.plugins`, `plugin.{id}.use`

## Plugin API

| Endpoint | Purpose |
|----------|---------|
| `GET/POST/DELETE /api/plugins/{id}/data` | Plugin storage |
| `POST /api/plugins/{id}/send-email` | Send mail (`email` capability) |
| `GET /api/plugins/{id}/assets/...` | Static files |

See [BUILD-A-PLUGIN.md — Plugin HTTP API](./BUILD-A-PLUGIN.md#plugin-http-api-summary).
