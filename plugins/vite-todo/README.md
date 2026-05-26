# Vite Todo — React example plugin

This plugin shows how to use **Vite + React** and upload the **build output** to Next-CMS.

## In admin

Open **Vite Todo → Todo app** for the React UI. Todos are stored via Plugin API (`collection: todos`).

## Rebuild the UI

```bash
cd plugins/vite-todo/vite-admin
npm install
npm run build
```

Output is written to `plugins/vite-todo/admin/app/` (index.html + assets/). `admin/pages.json` is kept separate.

Then refresh the plugin tab, or re-zip and upload.

## Source layout

```text
vite-todo/
  plugin.json
  admin/              ← built files (upload these)
  vite-admin/         ← Vite source (do not zip node_modules)
    vite.config.ts
    src/
```

See `docs/BUILD-A-PLUGIN.md` → **Using Vite**.
