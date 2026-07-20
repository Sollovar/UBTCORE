---
name: DB_HOST Replit secret has http:// prefix
description: The DB_HOST Replit secret includes "http://" and trailing "/", which breaks postgres connections
---

The Replit secret `DB_HOST` is stored as `http://hostname/` instead of just `hostname`. This causes postgres connection failures ("no such host" / DNS lookup of "http://...").

**Why:** The secret was set with a URL-style value instead of a bare hostname.

**How to apply:** Both `backend/internal/config/config.go` (sanitizeHost function) and `server/index.js` (sanitizeHost function) strip `http://`, `https://`, and trailing `/` from DB_HOST before using it. Any new service reading DB_HOST must do the same.
