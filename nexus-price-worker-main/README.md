# UNBOUND Price Worker

Standalone microservice that syncs live price + 24h change for all indexed pairs from GeckoTerminal.

## Why separate from the main server?

The main `server/` handles pair discovery (fetches trending pools, enriches token metadata).
This worker handles price updates on a fast 2-minute cycle.

Running them separately means:
- Each has its own rate limit budget
- If the price worker hits a 429, pair discovery is unaffected
- Can be scaled or restarted independently on Railway

## What it does

Every `SYNC_INTERVAL_SECONDS` (default: 120s):
1. Reads all pair IDs + pool addresses from Supabase
2. Groups by network
3. Calls GeckoTerminal's `/pools/multi/{addresses}` endpoint — **1 API call per network** (up to 30 pools each)
4. Parses: `price`, `price_usd`, `price_change_24h`, `volume_24h`, `liquidity`, `market_cap`
5. Caches each pair's stats in Redis: `pair:price:{pairId}` (TTL = 2× sync interval)
6. Upserts updated stats back to the `pairs` table in Supabase

## API call budget

| Worker             | Calls/cycle | Interval | Calls/min |
|--------------------|-------------|----------|-----------|
| server (discovery) | ~60         | 15 min   | 4         |
| price-worker       | 3           | 2 min    | 1.5       |
| **Total**          |             |          | **~5.5**  |

GeckoTerminal free tier allows 30 req/min → plenty of headroom.

## Setup

```bash
cd price-worker
npm install
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, and optionally REDIS_URL
npm start
```

## Redis key format

```
pair:price:{pairId}  →  {
  price:          number,   // native price (base/quote)
  priceUSD:       number,   // USD price of base token
  priceChange24h: number,   // % change last 24h
  volume24h:      number,   // USD volume last 24h
  liquidity:      number,   // pool reserves in USD
  marketCap:      number,   // market cap / FDV in USD
  updatedAt:      string    // ISO timestamp
}
TTL: SYNC_INTERVAL_SECONDS * 2
```

## Go backend integration

The Go backend already reads `price`, `price_usd`, `price_change_24h` etc. from the `pairs` table
in Supabase via `buildPairResponse` in `handlers.go`. Since this worker upserts those columns,
the Go backend serves fresh data on every API call with zero changes needed.

Optionally, the Go backend can also read directly from Redis using the key format above
for sub-second latency without hitting Supabase.

## Deploy on Railway

1. Create a new Railway service pointing to this folder
2. Set the env vars in Railway dashboard
3. Railway will run `npm start` automatically

Stagger the start time from the main server by ~2 minutes so they don't both hit GeckoTerminal at startup.
