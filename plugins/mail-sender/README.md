# Mail Sender plugin

Bundled example for Next-CMS. Use it as a reference when building your own plugin.

## Features

- SMTP settings (host, port, credentials)
- Email templates (HTML body + subject) — **your keys, your copy**
- Send test emails from admin
- **`automations`** in `plugin.json` — dynamic webhook actions (no hardcoded CMS presets)

## Automations

This plugin defines `automations` in `plugin.json`. After install:

1. Configure SMTP and create templates in admin (any template **key** you choose).
2. **Webhooks → inbound** → **Load action from installed plugin** → pick **Mail Sender**.
3. Edit handler JSON: set `templateKey` to your template key, adjust `toPath` / `subject` / `html`.
4. **Webhooks → outbound** on `entry.create` → inbound receive URL + secret header.

Details: [BUILD-A-PLUGIN.md — Automations](../../docs/BUILD-A-PLUGIN.md#automations-dynamic--defined-in-your-plugin)

## Files

| File | Role |
|------|------|
| `plugin.json` | Manifest (id, menu, SMTP settings, **automations**) |
| `admin/pages.json` | Admin tabs: overview, settings, templates, send |

## Documentation

**[docs/BUILD-A-PLUGIN.md](../../docs/BUILD-A-PLUGIN.md)**

## Copy to create your plugin

1. Duplicate this folder with a new name.
2. Change `id` in `plugin.json` (e.g. `my-mailer`).
3. Update `admin.menu.label`, `admin/pages.json`, and **`automations`** for your product.
4. Zip the folder and upload via Admin → Plugins.
