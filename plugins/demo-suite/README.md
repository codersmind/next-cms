# Demo Suite — Full Plugin Example

This plugin is the **complete reference** for Next-CMS plugins. Copy the folder, rename `id`, and adapt each part for your product.

---

## What this plugin demonstrates

| Feature | Tab / file | Purpose |
|---------|------------|---------|
| Guide (readme) | Guide | This README.md loaded in admin |
| Settings | General, SMTP | Two `settings` blocks in plugin.json |
| Collections | Email templates, Subscribers, Activity log | `text`, `textarea`, `richtext` fields |
| Send email | Send email | `email-send` + SMTP |
| Custom UI | API dashboard | `html` + admin/dashboard.html |
| Automations | (Webhooks admin) | Two entries in plugin.json → automations |
| Permissions | — | plugin.demo-suite.use |
| Capabilities | — | email, storage, settings |

---

## Folder structure

```text
demo-suite/
  plugin.json          Manifest: id, menu, settings, automations
  README.md            Shown on Guide tab
  admin/
    pages.json         All admin tabs
    dashboard.html     Custom HTML page (Plugin API demos)
```

After install, URLs look like:

- /admin/plugins/demo-suite
- /admin/plugins/demo-suite/general
- /admin/plugins/demo-suite/email-templates
- /admin/plugins/demo-suite/dashboard

---

## Step-by-step walkthrough

### 1. Install

1. Admin → Plugins (bundled folder auto-registers on page load)
2. Enable **Demo Suite** in the list
3. Assign permission **plugin.demo-suite.use** to your role (Super Admin has all)
4. Open **Demo Suite** in the sidebar

### 2. General settings

Tab **General** → set site name, support email, public URL (used when building webhook URLs).

Saved via Plugin API to collection `settings`, key `general`.

### 3. SMTP

Tab **SMTP** → configure mail server (required for **Send email** and automations).

Saved to collection `settings`, key `smtp`.

### 4. Email templates (collection)

Tab **Email templates** → create a record with key **welcome** (important for automation):

- Name: Welcome email
- Subject: Welcome, {{entry.name}}!
- HTML body: your design (placeholders work in automations)

Record **key** = what you type when adding (e.g. welcome).

### 5. Subscribers (collection)

Store plugin-only data (not CMS content types). Example: marketing list, API keys metadata, internal notes.

### 6. Activity log (collection)

Example audit trail. The **API dashboard** tab can append entries via JavaScript.

### 7. Send email (manual test)

Tab **Send email** → send a test message after SMTP is configured.

### 8. API dashboard (custom HTML)

Tab **API dashboard** → interactive page calling:

- GET  /api/plugins/demo-suite/data?collection=...
- POST /api/plugins/demo-suite/data
- POST /api/plugins/demo-suite/send-email

Uses localStorage JWT (same as admin). This is how you build custom UIs without changing CMS core.

### 9. Automations + webhooks (automatic email)

**Goal:** When someone submits a public CMS form, send welcome email + notify admin.

#### A. Create a CMS content type (example: registration form)

1. Content-Type Builder → e.g. Register Form → API plural `register-forms`
2. Fields: name, email (and any others)
3. Permissions → Public → allow **create** on register-forms

Public API test:

```http
POST /api/register-forms
Content-Type: application/json

{ "data": { "name": "Jane", "email": "jane@example.com" } }
```

#### B. Inbound webhook (runs plugin.sendEmail)

1. Admin → Webhooks → Add inbound
2. Enable action → **Load action from installed plugin** → **Demo Suite — Welcome email when CMS entry is created**
3. Edit handler JSON if needed: set templateKey to welcome (must match your template record key)
4. Save → copy receive URL and secret

#### C. Outbound webhook (fires on create)

1. Add outbound
2. URL = inbound receive URL from step B
3. Events = Entry created
4. Content types = register-forms (your plural API id)
5. Custom headers JSON:

```json
{ "x-webhook-secret": "YOUR_INBOUND_SECRET" }
```

#### D. Second automation (admin notify)

Create another inbound webhook (or combine logic later) using automation **Notify support inbox** — edit `to` in handler JSON to your real admin email.

#### E. Test

POST to register-forms → check Webhook deliveries → check inboxes.

---

## plugin.json reference (this plugin)

### capabilities

- storage — Plugin API /data
- settings — General + SMTP forms
- email — send-email endpoint + plugin.sendEmail handler

### automations

Defined in YOUR plugin, loaded dynamically in Webhooks admin (no hardcoded CMS presets).

1. welcome-email-on-create — toPath entry.email + template welcome
2. notify-admin-on-create — fixed to address (edit admin@example.com)

### settings blocks

- general — siteName, supportEmail, webhookBaseUrl
- smtp — host, port, user, pass, from

---

## Copy this plugin

1. Duplicate plugins/demo-suite → plugins/my-product
2. Change id in plugin.json (e.g. my-product)
3. Update admin.menu.label, pages.json, automations, README.md
4. Zip and upload, or drop folder in plugins/

Full author guide: docs/BUILD-A-PLUGIN.md in the repository.

---

## Compare with Mail Sender

| | Mail Sender | Demo Suite |
|---|-------------|------------|
| Focus | Production email | Learning / template |
| Pages | 4 tabs | 8 tabs (all types) |
| HTML dashboard | No | Yes |
| Automations | 1 | 2 |
| Settings | SMTP only | General + SMTP |

Use **Mail Sender** in production for email-only needs. Use **Demo Suite** to learn every feature once.
