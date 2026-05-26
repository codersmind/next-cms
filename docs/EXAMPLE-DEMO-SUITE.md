# Demo Suite — Full example plugin

The **Demo Suite** plugin (`plugins/demo-suite/`) is the canonical “learn everything” example for Next-CMS plugins.

## Quick links

| Resource | Location |
|----------|----------|
| Plugin source | `plugins/demo-suite/` |
| In-admin guide | Admin → **Demo Suite** → **Guide** tab (reads `README.md`) |
| Build guide | [BUILD-A-PLUGIN.md](./BUILD-A-PLUGIN.md) |
| Plugin overview | [PLUGINS.md](./PLUGINS.md) |

## Install

1. Start the CMS and open **Admin → Plugins** (bundled plugins register automatically).
2. Enable **Demo Suite (Full Example)**.
3. Open **Demo Suite** in the sidebar and follow the **Guide** tab.

## What it includes

- **All admin page types:** readme, settings (×2), collection (×3), email-send, html
- **Custom dashboard:** `admin/dashboard.html` calling Plugin API
- **Two automations:** welcome email + admin notification (configure in Webhooks)
- **End-to-end recipe:** public content type → webhooks → plugin email

## Suggested learning order

1. Browse every tab in the plugin admin UI.
2. Play with **API dashboard** (collections + test email).
3. Create an **email template** with key `welcome`.
4. Configure **SMTP** and send a manual test email.
5. Create a **register-forms** content type + Public create permission.
6. Wire **Webhooks** using **Load action from installed plugin → Demo Suite**.
7. POST to the public API and verify deliveries + email.

Detailed steps are in `plugins/demo-suite/README.md`.

## Start your own plugin

```text
cp -r plugins/demo-suite plugins/my-plugin
# Edit plugin.json id, menu label, automations, README.md
```

Then zip `my-plugin/` and upload via Admin → Plugins.
