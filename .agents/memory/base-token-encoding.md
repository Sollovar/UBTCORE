---
name: base_token 13-level JSON encoding bug
description: The base_token and quote_token JSONB columns for Base-network pairs are encoded 13 levels deep as JSON strings, making each pair 300-400KB. Fix is in trimTokenJSON which unwraps up to 20 levels.
---

## The Problem

`pairs.base_token` and `pairs.quote_token` DB columns (JSONB) for Base-network pairs are 300-400KB each, causing the `/api/v1/pairs` endpoint to return 72MB for 196 pairs (2s response time).

**Root cause**: A historical Pair Indexer bug called `JSON.stringify()` on the token object repeatedly over multiple indexer runs, stacking 13 levels of JSON string encoding in the JSONB column. GORM reads the JSONB as a Go string, and Go's JSON encoder adds a 14th level.

**Evidence**: Node.js recursive unwrapping needed 13 `JSON.parse()` calls on `p.base_token` before hitting the actual `{address, name, symbol, logo, decimals}` object.

**Why:** Only Base-network pairs are affected (they were indexed when the bug was active). Solana/BSC pairs stored later are small (2-3KB each).

## The Fix

`trimTokenJSON()` in `backend/internal/handlers/handlers.go` — loops up to 20 times:
1. If current string starts with `{`, parse as JSON object and keep only: `address`, `symbol`, `name`, `decimals`, `image_url`, `logo_uri`, `logo`, `coingecko_coin_id`
2. If current string starts with `"`, unwrap one JSON string level (`json.Unmarshal` into `string`) and continue
3. If neither, return `"{}"`

Called from `buildPairResponseFast()` on every cache refresh via `pairCopy.BaseToken = trimTokenJSON(pair.BaseToken)`.

## How to apply

- Never store `base_token`/`quote_token` from the Go side without calling `trimTokenJSON` first
- The cache pre-warm (`WarmOnce`) runs at startup before routes are registered, so the first request always gets trimmed data
- Cache worker interval: 30 seconds (was 3s — too aggressive given 1-2s Supabase query time)
- If the DB is cleaned up (SQL UPDATE to flatten the encoding), `trimTokenJSON` still works (it returns small objects quickly since they start with `{`)

## Result

- Response size: 625KB (was 72MB) — 115× smaller
- Response time: 25ms (was 2s) — 80× faster
- Per-pair size: avg 3.2KB, max 8.6KB (was avg 371KB, max 692KB)
