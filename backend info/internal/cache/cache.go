package cache

import (
        "context"
        "encoding/json"
        "log"
        "sync"
        "time"

        ristretto "github.com/dgraph-io/ristretto/v2"
        "github.com/maypok86/otter"
        "github.com/UNBOUND/backend/internal/models"
        "github.com/UNBOUND/backend/internal/repository"
)

// PairTicker is the lightweight per-pair market data stored in the otter cache.
// Contains only what the UI needs for the pairs list and ticker bar.
type PairTicker struct {
        Price          string `json:"price"`
        PriceUSD       string `json:"priceUSD"`
        PriceChange24h string `json:"priceChange24h"`
        High24h        string `json:"high24h"`
        Low24h         string `json:"low24h"`
        Volume24h      string `json:"volume24h"`
        Volume24hUSD   string `json:"volume24hUSD"`
        BaseSymbol     string `json:"baseSymbol"`
        QuoteSymbol    string `json:"quoteSymbol"`
        BaseName       string `json:"baseName"`
        QuoteName      string `json:"quoteName"`
        BaseLogo       string `json:"baseLogo"`
        QuoteLogo      string `json:"quoteLogo"`
}

// PairResponseBuilder is a callback that constructs and serialises a full PairResponse.
// Used only for on-demand single-pair refreshes (e.g. after an order fill).
type PairResponseBuilder func(ctx context.Context, pair *models.Pair) ([]byte, error)

// PairFastBuilder constructs a serialised PairResponse from the pair's own DB
// columns only — no extra DB queries, no external calls, pure CPU.
// Used by the background worker to keep the pairs list cache hot without
// saturating the connection pool.
type PairFastBuilder func(pair *models.Pair) ([]byte, error)

// CacheManager owns three in-memory caches:
//   - ticker   (otter):    lightweight PairTicker values, O(1) per-pair lookup
//   - pairsMap (sync.Map): pairs-list JSON blobs — guaranteed storage, no admission policy
//   - meta     (ristretto): full JSON blobs for individual pair, orderbooks, stats
type CacheManager struct {
        ticker    otter.Cache[string, PairTicker]
        pairsMap  sync.Map // key: "pairs:" or "pairs:<network>", value: []byte (JSON)
        meta      *ristretto.Cache[string, []byte]
        pairRepo  *repository.PairRepository
        orderRepo *repository.OrderRepository

        refreshLimit int

        // OnTickerBroadcast is an optional callback invoked after every cache refresh
        // for each pair whose price changed. The handler wires this to the WebSocket hub
        // so price updates reach connected clients without a circular import.
        OnTickerBroadcast func(pairID string, ticker PairTicker)
}

const (
        workerInterval   = 5 * time.Second  // refresh every 5s — keeps prices near-real-time
        metaTTL          = 60 * time.Second
        otterMaxItems    = 10_000
        ristrettoMaxCost = 128 << 20 // 128 MB
)

// NewManager constructs the dual-cache manager.
// Always returns a non-nil value; panics on construction failure.
func NewManager(pairRepo *repository.PairRepository, orderRepo *repository.OrderRepository) *CacheManager {
        tickerCache, err := otter.MustBuilder[string, PairTicker](otterMaxItems).Build()
        if err != nil {
                log.Fatalf("[Cache] otter build failed: %v", err)
        }

        metaCache, err := ristretto.NewCache[string, []byte](&ristretto.Config[string, []byte]{
                NumCounters: 1_000_000,
                MaxCost:     ristrettoMaxCost,
                BufferItems: 64,
        })
        if err != nil {
                log.Fatalf("[Cache] ristretto build failed: %v", err)
        }

        return &CacheManager{
                ticker:       tickerCache,
                meta:         metaCache,
                pairRepo:     pairRepo,
                orderRepo:    orderRepo,
                refreshLimit: 500,
        }
}

// IsEnabled always returns true — the in-memory caches are always available.
func (c *CacheManager) IsEnabled() bool { return c != nil }

// Ping is a no-op shim kept for API compatibility.
func (c *CacheManager) Ping(_ context.Context) error { return nil }

// ── Background worker ────────────────────────────────────────────────────────

// WarmOnce runs a single cache refresh synchronously and returns.
// Call this before accepting HTTP traffic so the first request always hits a warm cache.
func (c *CacheManager) WarmOnce(ctx context.Context, fastBuilder PairFastBuilder) {
        log.Println("[CacheWorker] pre-warming cache")
        c.refresh(ctx, fastBuilder)
        log.Println("[CacheWorker] pre-warm complete")
}

// Start runs the periodic cache-refresh loop until ctx is cancelled.
// Call WarmOnce first (synchronously) and then Start in a goroutine so the
// first HTTP request always hits a warm cache.
func (c *CacheManager) Start(ctx context.Context, fastBuilder PairFastBuilder) {
        log.Println("[CacheWorker] starting loop")

        t := time.NewTicker(workerInterval)
        defer t.Stop()

        for {
                select {
                case <-ctx.Done():
                        log.Println("[CacheWorker] stopping")
                        return
                case <-t.C:
                        c.refresh(ctx, fastBuilder)
                }
        }
}

// refresh loads all active pairs and populates all caches.
// One DB round-trip (GetAllActive), then pure CPU work — no extra DB queries.
// The pairs-list blobs go into sync.Map (guaranteed storage, no admission policy).
// Individual pair blobs go into ristretto (fine for smaller items).
func (c *CacheManager) refresh(ctx context.Context, fastBuilder PairFastBuilder) {
        pairs, err := c.pairRepo.GetAllActive(ctx, c.refreshLimit)
        if err != nil {
                log.Printf("[CacheWorker] load pairs: %v", err)
                return
        }
        log.Printf("[CacheWorker] refreshing %d pairs", len(pairs))

        type entry struct {
                network string
                payload json.RawMessage
        }

        entries := make([]entry, 0, len(pairs))

        for _, p := range pairs {
                pCopy := p

                // ── otter: lightweight ticker (pure CPU) ────────────────────────
                newTicker := pairToTicker(&pCopy)
                oldTicker, hadOld := c.ticker.Get(pCopy.ID)
                c.ticker.Set(pCopy.ID, newTicker)

                // ── ristretto: individual pair blob (pure CPU) ──────────────────
                payload, err := fastBuilder(&pCopy)
                if err != nil {
                        log.Printf("[CacheWorker] build %s: %v", pCopy.ID, err)
                        continue
                }
                c.meta.SetWithTTL("pair:"+pCopy.ID, payload, int64(len(payload)), metaTTL)

                entries = append(entries, entry{network: string(pCopy.Network), payload: json.RawMessage(payload)})

                // ── broadcast ticker if price changed ────────────────────────────
                // Fire the callback outside the loop so we don't hold the cache lock.
                if c.OnTickerBroadcast != nil {
                        if !hadOld || oldTicker.Price != newTicker.Price || oldTicker.PriceChange24h != newTicker.PriceChange24h {
                                id := pCopy.ID
                                t := newTicker
                                go c.OnTickerBroadcast(id, t)
                        }
                }
        }

        if len(entries) == 0 {
                return
        }

        // ── sync.Map: pairs-list blobs (guaranteed storage, zero-rejection) ─
        // Both json.Marshal([]json.RawMessage{...}) and json.Marshal([]*PairResponse{...})
        // produce identical [{...},{...}] JSON, so unmarshalCachedPairResponses handles
        // both the worker-written and miss-path-written formats correctly.
        allPayloads := make([]json.RawMessage, len(entries))
        netPayloads := make(map[string][]json.RawMessage, 4)
        for i, e := range entries {
                allPayloads[i] = e.payload
                netPayloads[e.network] = append(netPayloads[e.network], e.payload)
        }

        if b, err := json.Marshal(allPayloads); err == nil {
                c.pairsMap.Store("pairs:", b)
        }
        for net, payloads := range netPayloads {
                if b, err := json.Marshal(payloads); err == nil {
                        c.pairsMap.Store("pairs:"+net, b)
                }
        }
        log.Printf("[CacheWorker] cached %d pairs across %d networks", len(entries), len(netPayloads))
}

// RefreshPair refreshes the cache for a single pair on-demand.
func (c *CacheManager) RefreshPair(ctx context.Context, pairID string, builder PairResponseBuilder) error {
        pair, err := c.pairRepo.GetByID(ctx, pairID)
        if err != nil {
                return err
        }

        c.ticker.Set(pairID, pairToTicker(pair))

        payload, err := builder(ctx, pair)
        if err != nil {
                return err
        }
        c.meta.SetWithTTL("pair:"+pairID, payload, int64(len(payload)), metaTTL)

        if stats, err := c.pairRepo.GetStats(ctx, pairID); err == nil {
                if statBytes, err := json.Marshal(stats); err == nil {
                        c.meta.SetWithTTL("stats:"+pairID, statBytes, int64(len(statBytes)), metaTTL)
                }
        }

        if ob, err := c.orderRepo.GetOrderBook(ctx, pairID, pair.Network, 50); err == nil {
                if obBytes, err := json.Marshal(ob); err == nil {
                        c.meta.SetWithTTL("ob:"+pairID, obBytes, int64(len(obBytes)), metaTTL)
                }
        }
        return nil
}

// ── Public read/write accessors ──────────────────────────────────────────────

// GetCachedPairs returns the serialised pairs list for a given network ("" = all).
// Reads from sync.Map — guaranteed to find what was stored, no admission policy.
func (c *CacheManager) GetCachedPairs(_ context.Context, network string) ([]byte, error) {
        v, ok := c.pairsMap.Load("pairs:" + network)
        if !ok {
                return nil, errMiss("pairs:" + network)
        }
        return v.([]byte), nil
}

// CachePairsAll stores the serialised pairs list for a given network in sync.Map.
func (c *CacheManager) CachePairsAll(_ context.Context, network string, data []byte) error {
        c.pairsMap.Store("pairs:"+network, data)
        return nil
}

// DeleteCachedPairs evicts the pairs list for a given network.
func (c *CacheManager) DeleteCachedPairs(_ context.Context, network string) error {
        c.pairsMap.Delete("pairs:" + network)
        return nil
}

// GetCachedPair returns the full serialised PairResponse for one pair.
func (c *CacheManager) GetCachedPair(_ context.Context, pairID string) ([]byte, error) {
        v, ok := c.meta.Get("pair:" + pairID)
        if !ok {
                return nil, errMiss("pair:" + pairID)
        }
        return v, nil
}

// CachePair stores a full serialised PairResponse.
func (c *CacheManager) CachePair(_ context.Context, pairID string, data []byte) error {
        c.meta.SetWithTTL("pair:"+pairID, data, int64(len(data)), metaTTL)
        return nil
}

// GetCachedOrderbook returns a cached orderbook for a pair.
func (c *CacheManager) GetCachedOrderbook(_ context.Context, pairID string) ([]byte, error) {
        v, ok := c.meta.Get("ob:" + pairID)
        if !ok {
                return nil, errMiss("ob:" + pairID)
        }
        return v, nil
}

// CacheOrderbook stores an orderbook in ristretto.
func (c *CacheManager) CacheOrderbook(_ context.Context, pairID string, data []byte) error {
        c.meta.SetWithTTL("ob:"+pairID, data, int64(len(data)), metaTTL)
        return nil
}

// GetCachedStats returns cached trade stats for a pair.
func (c *CacheManager) GetCachedStats(_ context.Context, pairID string) ([]byte, error) {
        v, ok := c.meta.Get("stats:" + pairID)
        if !ok {
                return nil, errMiss("stats:" + pairID)
        }
        return v, nil
}

// CacheStats stores trade stats in ristretto.
func (c *CacheManager) CacheStats(_ context.Context, pairID string, data []byte) error {
        c.meta.SetWithTTL("stats:"+pairID, data, int64(len(data)), metaTTL)
        return nil
}

// DeleteCachedPair evicts a pair from ristretto.
func (c *CacheManager) DeleteCachedPair(_ context.Context, pairID string) error {
        c.meta.Del("pair:" + pairID)
        return nil
}

// DeleteCachedOrderbook evicts an orderbook from ristretto.
func (c *CacheManager) DeleteCachedOrderbook(_ context.Context, pairID string) error {
        c.meta.Del("ob:" + pairID)
        return nil
}

// DeleteCachedStats evicts stats for a pair from ristretto.
func (c *CacheManager) DeleteCachedStats(_ context.Context, pairID string) error {
        c.meta.Del("stats:" + pairID)
        return nil
}

// ClearAllPairs evicts all data from all caches.
func (c *CacheManager) ClearAllPairs(_ context.Context) error {
        c.ticker.Clear()
        c.meta.Clear()
        c.pairsMap.Range(func(k, _ any) bool {
                c.pairsMap.Delete(k)
                return true
        })
        return nil
}

// GetTicker returns the lightweight PairTicker from otter.
func (c *CacheManager) GetTicker(pairID string) (PairTicker, bool) {
        return c.ticker.Get(pairID)
}

// SetTicker stores a PairTicker in otter.
func (c *CacheManager) SetTicker(pairID string, t PairTicker) {
        c.ticker.Set(pairID, t)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func errMiss(key string) error {
        return &cacheMiss{key: key}
}

type cacheMiss struct{ key string }

func (e *cacheMiss) Error() string { return "cache miss: " + e.key }

// pairToTicker extracts lightweight ticker fields from a Pair model row.
func pairToTicker(p *models.Pair) PairTicker {
        baseSymbol := p.BaseSymbol
        quoteSymbol := p.QuoteSymbol
        baseName, quoteName, baseLogo, quoteLogo := "", "", "", ""

        if len(p.BaseToken) > 0 {
                var bt map[string]interface{}
                if json.Unmarshal([]byte(p.BaseToken), &bt) == nil {
                        if s, ok := bt["symbol"].(string); ok && s != "" {
                                baseSymbol = s
                        }
                        if n, ok := bt["name"].(string); ok {
                                baseName = n
                        }
                        if l, ok := bt["logo"].(string); ok {
                                baseLogo = l
                        }
                }
        }
        if len(p.QuoteToken) > 0 {
                var qt map[string]interface{}
                if json.Unmarshal([]byte(p.QuoteToken), &qt) == nil {
                        if s, ok := qt["symbol"].(string); ok && s != "" {
                                quoteSymbol = s
                        }
                        if n, ok := qt["name"].(string); ok {
                                quoteName = n
                        }
                        if l, ok := qt["logo"].(string); ok {
                                quoteLogo = l
                        }
                }
        }

        return PairTicker{
                Price:          p.Price.String(),
                PriceUSD:       p.PriceUSD.String(),
                PriceChange24h: p.PriceChange24h.String(),
                High24h:        p.PriceHigh24h.String(),
                Low24h:         p.PriceLow24h.String(),
                Volume24h:      p.Volume24h.String(),
                Volume24hUSD:   p.Volume24hUSD.String(),
                BaseSymbol:     baseSymbol,
                QuoteSymbol:    quoteSymbol,
                BaseName:       baseName,
                QuoteName:      quoteName,
                BaseLogo:       baseLogo,
                QuoteLogo:      quoteLogo,
        }
}
