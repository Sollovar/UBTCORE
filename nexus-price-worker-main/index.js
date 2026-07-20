/**
 * UNBOUND Price Worker
 * ------------------
 * Every SYNC_INTERVAL_SECONDS:
 *  1. Reads all pairs from the local Postgres pairs table
 *  2. Groups by network
 *  3. Calls GeckoTerminal /pools/multi/{addresses} — 1 API call per network
 *  4. Parses price, price_change_24h, volume_24h, liquidity, market_cap
 *  5. UPDATEs (never inserts) the local 'pairs' table
 *
 * The Go backend reads prices directly from the local 'pairs' table.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import cron from 'node-cron';
import pkg from 'pg';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '.env') });

/* ── Config ───────────────────────────────────────────── */
const SYNC_INTERVAL_SEC = parseInt(process.env.SYNC_INTERVAL_SECONDS || '120', 10);
const BATCH_SIZE        = parseInt(process.env.BATCH_SIZE || '30', 10);
const NETWORKS          = (process.env.NETWORKS || 'bsc,base,solana').split(',').map(s => s.trim());
const GECKO_BASE        = 'https://api.geckoterminal.com/api/v2';

/** Map our network names → GeckoTerminal slugs */
const NETWORK_MAP = {
  bsc:      'bsc',
  base:     'base',
  solana:   'solana',
  ethereum: 'eth',
  arbitrum: 'arbitrum',
  polygon:  'polygon_pos',
  avalanche:'avax',
};

/* ── Postgres client ─────────────────────────────────── */
const sanitizeHost = raw => {
  if (!raw) return raw;
  return raw.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
};

if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    if (!process.env.DB_HOST) process.env.DB_HOST = u.hostname;
    if (!process.env.DB_PORT) process.env.DB_PORT = u.port || '5432';
    if (!process.env.DB_USER) process.env.DB_USER = u.username;
    if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = u.password;
    if (!process.env.DB_NAME) process.env.DB_NAME = u.pathname.replace(/^\//, '');
  } catch (_) {}
}

if (!process.env.DB_HOST && process.env.PGHOST) process.env.DB_HOST = process.env.PGHOST;
if (!process.env.DB_USER && process.env.PGUSER) process.env.DB_USER = process.env.PGUSER;
if (!process.env.DB_PASSWORD && process.env.PGPASSWORD) process.env.DB_PASSWORD = process.env.PGPASSWORD;
if (!process.env.DB_NAME && process.env.PGDATABASE) process.env.DB_NAME = process.env.PGDATABASE;
if (!process.env.DB_PORT && process.env.PGPORT) process.env.DB_PORT = process.env.PGPORT;

if (!process.env.DB_HOST) process.env.DB_HOST = '127.0.0.1';
if (!process.env.DB_PORT) process.env.DB_PORT = '5432';
if (!process.env.DB_USER) process.env.DB_USER = 'postgres';
if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = 'Supabase123!';
if (!process.env.DB_NAME) process.env.DB_NAME = 'postgres';

const dbHost = sanitizeHost(process.env.DB_HOST);
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME || 'postgres';
const isLocalDb = dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === 'helium';

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

/* ── Helpers ──────────────────────────────────────────── */
const sleep   = ms => new Promise(r => setTimeout(r, ms));
const parseNum = str => { const n = parseFloat(str); return isNaN(n) ? 0 : n; };
const chunks  = (arr, n) => {
  const r = [];
  for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n));
  return r;
};

/**
 * Fetch with retry + 429 handling.
 * Returns parsed JSON or null on error/404.
 */
const fetchGecko = async (url, attempt = 1) => {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'UNBOUND-PriceWorker/1.0' },
    });

    if (res.status === 429) {
      const after = parseInt(res.headers.get('Retry-After') || '60', 10);
      const wait  = (isNaN(after) ? 60 : after) * 1000 * attempt;
      console.warn(`[GT] 429 — waiting ${wait / 1000}s (attempt ${attempt})`);
      await sleep(wait);
      return attempt < 4 ? fetchGecko(url, attempt + 1) : null;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      if (attempt < 4) { await sleep(2000 * attempt); return fetchGecko(url, attempt + 1); }
      console.error(`[GT] HTTP ${res.status} for ${url}`);
      return null;
    }
    return res.json();
  } catch (err) {
    if (attempt < 4) { await sleep(2000 * attempt); return fetchGecko(url, attempt + 1); }
    console.error(`[GT] fetch error: ${err.message}`);
    return null;
  }
};

/* ── DB helpers ───────────────────────────────────────── */

const ensurePriceColumns = async () => {
  const statements = [
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS price_usd NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS price_change_24h NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS volume_24h NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS volume_24h_usd NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS liquidity NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS liquidity_usd NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS market_cap NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS market_cap_usd NUMERIC DEFAULT 0",
    "ALTER TABLE pairs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ"
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.warn(`[PG] schema warning: ${err.message}`);
    }
  }
};

/** Load all pairs that have a pool_address */
const loadPairs = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT id, network, pool_address FROM pairs WHERE pool_address IS NOT NULL AND TRIM(pool_address) <> ''"
    );
    return rows;
  } catch (err) {
    console.error('[PG] loadPairs:', err.message);
    return [];
  }
};

/**
 * UPDATE price columns for a batch of pairs.
 * Uses individual updates to avoid upsert inserting new rows.
 */
const savePrices = async (updates) => {
  if (!updates.length) return;
  let errors = 0;
  for (const { id, ...fields } of updates) {
    try {
      await pool.query(
        `UPDATE pairs SET
          price = $1,
          price_usd = $2,
          price_change_24h = $3,
          volume_24h = $4,
          volume_24h_usd = $5,
          liquidity = $6,
          liquidity_usd = $7,
          market_cap = $8,
          market_cap_usd = $9,
          updated_at = $10
        WHERE id = $11`,
        [
          fields.price,
          fields.price_usd,
          fields.price_change_24h,
          fields.volume_24h,
          fields.volume_24h_usd,
          fields.liquidity,
          fields.liquidity_usd,
          fields.market_cap,
          fields.market_cap_usd,
          fields.updated_at,
          id,
        ]
      );
    } catch (err) {
      errors++;
      if (errors <= 3) console.error(`[PG] update ${id}:`, err.message);
    }
  }
  if (errors > 3) console.error(`[PG] ... and ${errors - 3} more update errors`);
};

/* ── GeckoTerminal price fetch ────────────────────────── */

/**
 * Fetch prices for up to BATCH_SIZE pools in one API call.
 * Returns { poolAddress → priceStats }
 * NOTE: EVM addresses are lowercased for consistent matching.
 *       Solana addresses are case-sensitive (base58) — preserved as-is.
 */
const fetchBatchPrices = async (geckoNetwork, addresses) => {
  const url  = `${GECKO_BASE}/networks/${geckoNetwork}/pools/multi/${addresses.join(',')}`;
  const data = await fetchGecko(url);
  if (!data?.data) return {};

  const isSolana = geckoNetwork === 'solana';

  const result = {};
  for (const pool of data.data) {
    const a    = pool.attributes;
    const raw  = a.address;
    if (!raw) continue;
    // Solana: preserve case. EVM: lowercase for consistent key matching.
    const addr = isSolana ? raw : raw.toLowerCase();

    result[addr] = {
      // base_token_price_quote_token = price expressed in the pair's quote token (e.g. USDT, WBNB, etc.)
      // This is what should be stored as "price" — matches what GeckoTerminal shows on the pair page.
      // base_token_price_native_currency would give BNB price even on USDT pairs, which is wrong.
      price:            parseNum(a.base_token_price_quote_token ?? a.base_token_price_native_currency),
      price_usd:        parseNum(a.base_token_price_usd),
      price_change_24h: parseNum(a.price_change_percentage?.h24 ?? a.price_percentage_change_h24 ?? 0),
      volume_24h:       parseNum(a.volume_usd?.h24 ?? 0),
      volume_24h_usd:   parseNum(a.volume_usd?.h24 ?? 0),
      liquidity:        parseNum(a.reserve_in_usd ?? 0),
      liquidity_usd:    parseNum(a.reserve_in_usd ?? 0),
      market_cap:       parseNum(a.market_cap_usd ?? a.fdv_usd ?? 0),
      market_cap_usd:   parseNum(a.market_cap_usd ?? a.fdv_usd ?? 0),
      updated_at:       new Date().toISOString(),
    };
  }
  return result;
};

/* ── Main sync ────────────────────────────────────────── */
const syncPrices = async () => {
  const t0 = Date.now();
  console.log(`[PriceWorker] Sync @ ${new Date().toISOString()}`);

  const allPairs = await loadPairs();
  if (!allPairs.length) { console.log('[PriceWorker] No pairs — skip'); return; }

  // Group by network
  const byNet = {};
  for (const p of allPairs) {
    const net = p.network?.toLowerCase();
    if (!net || !NETWORKS.includes(net)) continue;
    (byNet[net] ??= []).push(p);
  }

  const updates    = [];
  let   apiCalls   = 0;
  let   priceCount = 0;

  for (const [network, pairs] of Object.entries(byNet)) {
    const geckoNet = NETWORK_MAP[network];
    if (!geckoNet) { console.warn(`[PriceWorker] No GT mapping for: ${network}`); continue; }

    const batches = chunks(pairs, BATCH_SIZE);
    console.log(`[PriceWorker] ${network}: ${pairs.length} pairs → ${batches.length} batch(es)`);

    for (const batch of batches) {
      // Solana: preserve case. EVM: lowercase for GeckoTerminal URL matching.
      const isSolana = network === 'solana';
      const addrs    = batch.map(p => isSolana ? p.pool_address : p.pool_address.toLowerCase());
      const priceMap = await fetchBatchPrices(geckoNet, addrs);
      apiCalls++;

      for (const pair of batch) {
        const key   = isSolana ? pair.pool_address : pair.pool_address.toLowerCase();
        const stats = priceMap[key];
        if (!stats) continue;
        // Only update if we got a real price
        if (stats.price <= 0 && stats.price_usd <= 0) continue;

        updates.push({
          id: pair.id,
          price:            String(stats.price),
          price_usd:        String(stats.price_usd),
          price_change_24h: String(stats.price_change_24h),
          volume_24h:       String(stats.volume_24h),
          volume_24h_usd:   String(stats.volume_24h_usd),
          liquidity:        String(stats.liquidity),
          liquidity_usd:    String(stats.liquidity_usd),
          // market_cap may be bigint in old schema — send integer
          market_cap:       Math.floor(stats.market_cap),
          market_cap_usd:   Math.floor(stats.market_cap_usd),
          updated_at:       stats.updated_at,
        });
        priceCount++;
      }

      if (batches.length > 1) await sleep(500);
    }

    const nets = Object.keys(byNet);
    if (network !== nets[nets.length - 1]) await sleep(2000);
  }

  // Persist to Supabase in batches of 20
  for (const batch of chunks(updates, 20)) {
    await savePrices(batch);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[PriceWorker] Done — ${priceCount} prices synced, ${apiCalls} API calls, ${elapsed}s`);
};

/* ── Bootstrap ────────────────────────────────────────── */
(async () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  UNBOUND Price Worker                  ║');
  console.log(`║  Interval : every ${SYNC_INTERVAL_SEC}s              ║`);
  console.log(`║  Batch    : ${BATCH_SIZE} pools/call              ║`);
  console.log(`║  Networks : ${NETWORKS.join(', ')}       ║`);
  console.log(`║  Storage  : Postgres (${dbHost}:${dbPort}/${dbName}) ║`);
  console.log('╚══════════════════════════════════════╝');

  await ensurePriceColumns();

  // Run immediately on startup
  await syncPrices();

  // Schedule
  const mins  = Math.max(1, Math.round(SYNC_INTERVAL_SEC / 60));
  const cexpr = `*/${mins} * * * *`;
  console.log(`[PriceWorker] Cron: "${cexpr}"`);
  cron.schedule(cexpr, syncPrices);
})();
