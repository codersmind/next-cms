# Security notes (Next-CMS)

## Production checklist

| Item | Action |
|------|--------|
| `JWT_SECRET` | Set to a random string **≥ 32 characters** (required in production) |
| Inbound webhooks | Always use a secret; regenerate any webhook created without one |
| Public role | Grant only minimum content-type permissions |
| Plugins | Treat ZIP uploads as trusted code; restrict `admin.plugins` |
| SMTP | Store credentials in env when possible; plugin settings are redacted on read |

## Hardening included in codebase

- Upload path traversal protection (`src/lib/security/path.ts`)
- Plugin asset auth + path allowlist (`admin/**`, `README.md` only)
- Plugin data secret redaction on GET
- Public API forced to `publicationState=live` when unauthenticated
- Document field whitelist per content-type schema
- Inbound webhook secret required (timing-safe compare)
- Outbound webhook SSRF blocks (localhost/private IPs)
- ZIP install limits (size, file count, uncompressed total)
- Permission action allowlist for admin UI
- Super Admin role assignment restricted

## Plugin iframe model

Plugin HTML runs in a sandboxed iframe and loads assets with `access_token` (admin JWT). Same-origin plugins can still access admin APIs if malicious—only install plugins from trusted sources.
