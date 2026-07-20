# UNBOUND DEX - Complete Documentation

**UNBOUND** is a professional-grade, decentralized exchange (DEX) built on an **orderbook model** with **multi-chain support**, **MEV/front-running protection**, and **real-time market data**. It's designed for traders who demand advanced trading tools, early access to emerging tokens, and decentralized custody—without the limitations of traditional AMM-based DEXs.

**Core Tagline:** "Professional Trading, Fully Decentralized"  
**Brand:** UNBOUND DEX - Trade the Next Generation of Crypto Markets

---

## Table of Contents

1. [Core Features](#core-features)
2. [Supported Networks](#supported-networks)
3. [Order Types & Trading](#order-types--trading)
4. [Security Features](#security-features)
5. [User Experience](#user-experience)
6. [Backend Architecture](#backend-architecture)
7. [Portfolio & Markets](#portfolio--markets)
8. [Smart Contracts](#smart-contracts)
9. [Why UNBOUND](#why-unbound)
10. [Getting Started](#getting-started)

---

## Core Features

### Advanced Order Book System

UNBOUND operates on a **traditional order book model** rather than an AMM (Automated Market Maker). This provides:

- **High-performance matching engine** built in Go for concurrent order processing
- **Real-time order book** with visual bid/ask depth (colored bars)
- **Aggregatable price levels** with configurable tick size (raw pricing to 50+ unit increments)
- **Dual price feeds**:
  - Exchange prices from live fills
  - Gecko Terminal reference prices for market comparison
- **Trending score calculation**: Volume (24h) + Liquidity + Price change weighted algorithm

**Key Advantage:** Accurate market depth visualization and competitive pricing for traders, unlike AMMs where slippage increases with trade size.

### Multiple Order Types

UNBOUND supports professional trading order types:

1. **Limit Orders** - Trade at a fixed price or better
2. **Market Orders** - Execute immediately at current best price
3. **Stop-Loss Orders** - Automatically trigger when price falls below specified level
4. **Take-Profit Orders** - Automatically trigger when price rises above specified level
5. **Ladder Orders** - Split orders across multiple price levels
   - Parent order divides into child orders at evenly-spaced prices
   - Partial fills per level, unfilled amounts refunded
   - Full tracking with expand/collapse hierarchy
   - Sell-side primary use case (market making)
6. **Post-Only Orders** - Maker-only orders rejected if they would fill immediately

### Real-Time Market Data

- **Live WebSocket feeds**: Price updates fire within milliseconds of fills (`price_update` event)
- **Full market statistics**: 24h change %, volume, liquidity, high/low prices, market cap
- **Price flash animations**: Visual feedback (7-second highlight) when prices move up/down
- **Gecko Terminal integration**: Reference prices synced every 2 minutes from CoinGecko
- **Exchange vs. Gecko comparison**: Display both exchange and reference prices side-by-side
- **Trending pair discovery**: Auto-ranked pairs by momentum (high volume, liquidity, price volatility)

---

## Supported Networks

### Blockchains

UNBOUND currently operates on:

- **BSC (Binance Smart Chain)** - Chain ID 56, primary network
- **Base** - Ethereum Layer 2, Chain ID 8453  
- **Solana** - Mainnet via Helius RPC

*Future networks coming soon*

### Trading Pairs

- **~10,000+ pairs** across all networks
- **Dynamic discovery**: New pairs automatically indexed from GeckoTerminal + pool contracts
- **Search functionality**: Find pairs by symbol, token address, or network
- **Trending pairs panel**: Auto-updated list of high-momentum trading opportunities
- **Pair metadata**: Base/quote symbols, network, decimals, current price, 24h stats

### Price Data Sources

1. **Price Worker (Background Service)**
   - Syncs prices from GeckoTerminal every ~2 minutes
   - Updates market cap, liquidity, 24h metrics
   - Stores in PostgreSQL, distributed via WebSocket

2. **On-Chain Fills**
   - Real-time `price_update` events on every executed trade
   - Broadcast immediately to all connected clients (< 100ms latency)

3. **GeckoTerminal API**
   - Reference prices for each pair
   - Market cap and liquidity data
   - Historical data for charting

---

## Order Types & Trading

### Order Creation Flow

```
1. User selects pair (market panel dropdown)
2. User selects side (Buy ↔ Sell button)
3. User selects order type (Limit / Market / Ladder dropdown)
4. User enters amount (three input modes):
   - Base token (how many coins)
   - Quote token (USD/USDT spend/receive)
   - Percentage slider (% of wallet balance, 1-100%)
5. User sets optional parameters:
   - Price (for Limit orders)
   - Expiration (minutes/hours/days)
   - Stop-loss / Take-profit (optional)
   - Post-only flag (maker-only)
6. User clicks "Place Order" → confirmation → submitted to backend
```

### Order Execution Lifecycle

```
Frontend → Backend API
    ↓
[Order Stored in DB + Added to Order Book]
    ↓
[Matching Engine Attempts to Match]
    ↓
[Fills Found? → Executor Service]
    ↓
[Settlement Contract Called] → Transfers executed
    ↓
[WebSocket Broadcast]:
  - price_update (immediate)
  - order_update (status change)
  - ticker (full market data)
```

### Ladder Orders (Advanced)

Ladder orders automatically split a parent order into multiple child orders at evenly-spaced price levels:

```
User Input:
  Side: SELL
  Amount: 10 BTC
  Price Range: $45,000 - $50,000
  Levels: 5

System Creates:
  Order 1: 2 BTC @ $45,000
  Order 2: 2 BTC @ $46,250
  Order 3: 2 BTC @ $47,500
  Order 4: 2 BTC @ $48,750
  Order 5: 2 BTC @ $50,000

Execution:
  - Each order fills independently as market moves
  - Filled orders removed from book
  - Unfilled orders remain active
  - Historical view shows parent → child breakdown
  - Refunds apply to unfilled amounts (Solana)
```

---

## Security Features

### Front-Running Protection (Commit-Reveal Protocol)

UNBOUND uses a **two-phase order commitment** to prevent MEV attacks and sandwich attacks:

#### Phase 1: Commit
- User submits order hash (cryptographic commitment) off-chain
- Commitment stored in backend database
- No sensitive order details exposed

#### Phase 2: Reveal
- After next block is produced, user reveals full order details
- Backend verifies commitment matches revealed order
- Order matched and settled on-chain

**Security Guarantee:** Validators/miners cannot front-run by seeing pending orders in mempool

**Endpoints:**
- `POST /api/v1/orders/commit` - Submit order hash
- `POST /api/v1/orders/reveal` - Reveal full order

### On-Chain Settlement

Orders are executed on-chain through smart contracts deployed on each network:

**BSC Settlement Contract:**  
`0x4896ebe3EE1436a58c690A8021301A6bFD6BD4E7`

**Base Settlement Contract:**  
`0x723da0ef5eea8370015465e9Cf2513D7e48e1b61`

#### Settlement Flow

1. **Matching Engine** matches orders in backend
2. **Executor Service** detects fills (runs every 5 seconds)
3. **Settlement Contract** called with:
   - Maker wallet address
   - Taker wallet address
   - Token amounts
   - Settlement signature
4. **Token Transfer** executed:
   - EVM (BSC/Base): Direct token transfers between wallets
   - Solana: Refund processing from custody address

### User Custody & Asset Security

- **Full decentralization**: Users connect wallets (MetaMask, Phantom, Coinbase Wallet)
- **Assets never in platform custody** (except during Solana trades):
  - Tokens transferred directly from user wallet → settlement contract → other user wallet
  - Platform has zero access to user private keys or funds
- **Solana special handling**:
  - User deposits to platform custody address (`HpFAMjQ5Vxp8J7HMvPGNEXZgWxdvxqd6MzXX8DdqqXA3`)
  - After trade settlement, remaining balance automatically refunded to user wallet
  - Custody address controlled by platform, asset flow transparent

---

## User Experience

### Real-Time Pricing & Updates

- **Live ticker tape**: Scrolling pair strip at top of page (BTC, ETH, SOL, BNB, etc.)
- **Mini price charts**: 24h trend visualization for current pair
- **Instant updates**: Sub-second WebSocket latency for `price_update` messages
- **Order book visualization**:
  - Red bars = sell orders (asks)
  - Green bars = buy orders (bids)
  - Bar height = cumulative depth at price level
  - Hover for exact amounts
- **Flash indicators**: Prices briefly highlight green (up) or red (down) when changing

### Mobile Experience

- **Touch-optimized forms**: Large inputs, clear buttons, comfortable spacing
- **Hamburger menu**: Navigation, settings, resources
- **Bottom sheet modals**: Orders, trades, market selection slide up from bottom
- **Swipeable tabs**: Horizontal pan between Open Orders ↔ Ladder History ↔ Order History ↔ Trade History
- **Responsive layout**: Single-column design optimized for small screens
- **Real-time updates**: All data streams work seamlessly on mobile
- **Offline handling**: Orders queue locally if connection drops

### Desktop Experience

- **Full-featured layout**: Chart + Order Book + Order Form side-by-side
- **Resizable panels**: Drag panel borders to adjust relative sizes
- **Top navigation bar**: Portfolio, notifications, settings, resources
- **Keyboard support**: Future hotkey trading shortcuts
- **Settings modal**: Language selection, preferences, account info
- **Charts**: TradingView lightweight charts with multiple timeframes

### Common UI Elements

- **Dark theme**: System-wide dark mode using CSS variables
- **Multi-language support**: Internationalization framework (i18n) - extensible for additional languages
- **Wallet integration**: Dynamic Labs SDK - supports MetaMask, Phantom, Coinbase Wallet, and more
- **Real-time data**: Live updates via WebSocket for prices, orders, trades
- **Responsive images**: All logos use `objectFit: contain` for consistent display

---

## Backend Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Web UI, real-time updates |
| **Backend** | Go 1.21+ | High-performance API, matching engine |
| **Database** | PostgreSQL (Supabase) | Orders, fills, pairs, balances, users |
| **Caching** | Redis (Upstash) | Order book cache, hot data |
| **Real-Time** | WebSocket (Go) | Live prices, order updates, trades |
| **Node Services** | Node.js + Express | Pair indexer, price worker |
| **Price Feeds** | GeckoTerminal API | Pair discovery, market data |
| **Chain RPC** | Infura, Helius | BSC, Base, Solana interaction |

### Service Architecture

```
┌──────────────────────────────────────────────────┐
│  Frontend (React/Vite, Port 5000)               │
│  - Desktop UI (resizable panels)                │
│  - Mobile UI (touch-optimized)                  │
│  - WebSocket client                             │
│  - Portfolio display                            │
└──────────────────────────────────────────────────┘
                      ↓↑ HTTP/WS
┌──────────────────────────────────────────────────┐
│  Go Backend (Port 8080)                         │
│  ├─ REST API (/api/v1/pairs, /orders, etc.)    │
│  ├─ WebSocket Hub (real-time broadcasts)       │
│  ├─ Matching Engine (concurrent matching)      │
│  ├─ Order Book Cache (in-memory)              │
│  ├─ Price Monitor (stop-loss/take-profit)     │
│  ├─ Executor Service (blockchain settlement)  │
│  └─ Database Layer (PostgreSQL ORM)            │
└──────────────────────────────────────────────────┘
        ↓↑          ↓↑          ↓↑
   PostgreSQL    Redis       Blockchain
   (Orders,     (Cache)     (Settlement)
    Fills,
   Balances)
     ↑↓
┌──────────────────────────────────────────────────┐
│  Node.js Services                              │
│  ├─ Pair Indexer (Port 3001, GeckoTerminal)   │
│  └─ Price Worker (Background, syncs prices)   │
└──────────────────────────────────────────────────┘
```

### Key Data Models

**Order**
- Order ID, Pair ID, User address, Side (buy/sell)
- Type (limit/market/stop/ladder), Price, Amount
- Status (pending/partial/filled/cancelled), Expiration
- Created/Updated timestamps

**Fill**
- Fill ID, Maker Order ID, Taker Order ID
- Maker/Taker addresses, Price, Amount
- Amount In (quote), Amount Out (base)
- Transaction hash (for settlement tracking)

**Pair**
- Pair ID (unique identifier), Network, Base Token, Quote Token
- Current price (exchange + gecko), 24h stats (change %, volume, liquidity)
- Market cap, high/low prices
- Liquidity in USD, trending score

**Balance**
- User address, Token address, Network
- Balance (raw Wei format), Decimal places
- Updated timestamp

**Deposit** (Solana only)
- Deposit ID, User address, Amount, Status (pending/credited/failed)
- Transaction hash, Refund address

### API Endpoints

#### Public Endpoints

```
GET  /health                          → Health check
GET  /api/v1/pairs                    → List all pairs
GET  /api/v1/pairs/:id                → Get single pair + orderbook
GET  /api/v1/pairs/:id/orderbook      → Get bid/ask depth
GET  /api/v1/pairs/:id/trades         → Get recent trades
GET  /api/v1/pairs/:id/ticker         → Get ticker data
GET  /api/v1/search?q=BTC             → Search pairs by symbol
GET  /ws                              → WebSocket upgrade
```

#### Protected Endpoints (Require JWT)

```
GET  /api/v1/user/profile             → User account info
GET  /api/v1/user/balances            → Token balances per network
POST /api/v1/orders                   → Create order
GET  /api/v1/orders                   → Get user's open orders
GET  /api/v1/orders?status=filled     → Get order history
DELETE /api/v1/orders/:id             → Cancel order
POST /api/v1/orders/commit            → Commit order (MEV protection)
POST /api/v1/orders/reveal            → Reveal order (MEV protection)
POST /api/v1/deposits                 → Create Solana deposit
GET  /api/v1/deposits                 → Get deposit status
```

### Matching Engine

The matching engine is the core of UNBOUND's trading system:

```go
type MatchingEngine struct {
  orderBooks map[string]*OrderBook  // One book per pair
  matchChan  chan *MatchRequest     // Concurrent order queue
  priceMonitor *PriceMonitor       // Stop-loss/take-profit triggers
}

type OrderBook struct {
  Asks []PriceLevel  // Sorted ascending (lowest ask first)
  Bids []PriceLevel  // Sorted descending (highest bid first)
  Sequence int64     // Incremented on each update
}
```

**Matching Logic:**
1. New order arrives in `matchChan`
2. Engine finds matching orders on opposite side
3. If multiple matches: taker matches with best price first
4. Fill recorded for each match
5. Remaining order added to order book
6. Order status updated in database
7. WebSocket broadcast triggers price_update + ticker

---

## Portfolio & Markets

### Portfolio Tracking

UNBOUND integrates with **Zerion API** for real-time portfolio tracking across networks:

**Supported Networks:**
- Ethereum
- Binance Smart Chain (BSC)
- Base
- Solana
- Arbitrum
- Optimism
- Polygon
- Avalanche

**Portfolio Data:**
```
{
  holdings: [
    {
      symbol: "ETH",
      name: "Ethereum",
      count: 2.5,
      priceUsd: 2500,
      valueUsd: 6250,
      priceChange24h: 5.2,
      unrealizedPnlUsd: 312.50,
      unrealizedPnlPct: 5.2,
      realizedPnlUsd: 1000,
      allTimePnlUsd: 1312.50
    }
  ],
  summary: {
    totalValueUsd: 50000,
    totalCostUsd: 48000,
    unrealizedPnlUsd: 2000,
    realizedPnlUsd: 5000,
    allTimePnlUsd: 7000,
    pnl24hUsd: 150,
    pnl24hPct: 0.3
  }
}
```

### Market Intelligence

**Trending Score Algorithm**
```
Score = (Volume24h_rank × 10) + (Liquidity_rank × 8) + (PriceChange_pct × 0.5)
Scale: 0-100 (higher = more trending)
```

**Pair Discovery Features:**
- Automatic indexing of new token pairs
- Early access to emerging tokens (before CEX listing)
- Real-time liquidity monitoring
- Price momentum tracking
- Favorites pinned to quick-access list (browser localStorage)

### Fee Structure

- **Trading fees**: 0.1% per trade (displayed in order preview)
- **No hidden fees**: All costs transparent
- **Future tiers**: Potential VIP discounts (not yet implemented)

---

## Smart Contracts

### Settlement Contracts

UNBOUND uses smart contracts for transparent, on-chain trade execution:

**BSC (Binance Smart Chain)**
```
Address: 0x4896ebe3EE1436a58c690A8021301A6bFD6BD4E7
Chain ID: 56
Purpose: Execute trades, transfer tokens
```

**Base (Layer 2)**
```
Address: 0x723da0ef5eea8370015465e9Cf2513D7e48e1b61
Chain ID: 8453
Purpose: Execute trades, transfer tokens
```

### Settlement Flow

```
1. Backend matching engine matches orders
2. Executor service detects fills (polls every 5 seconds)
3. Executor calls settlement contract:
   transfer(
     maker: 0x123...,
     taker: 0x456...,
     tokenA: 0xabc...,
     tokenB: 0xdef...,
     amountA: 1000000000000000000,
     amountB: 5000000000000000000,
     signature: 0x789...
   )
4. Contract verifies:
   - Signature validity
   - Token balances
   - Non-reentrancy
5. Contract executes transfers:
   tokenA.transfer(maker, amountB)
   tokenB.transfer(taker, amountA)
6. Events emitted for logging
7. Frontend receives WebSocket update
```

### Token Support

- **Any ERC-20 token** on BSC or Base
- **Any SPL token** on Solana
- **No token whitelist**: All tokens discoverable via GeckoTerminal API

### Solana Special Handling

Solana uses a **custody model**:

```
User Deposits USD → Custody Address (0xHpFA...)
       ↓
     Trade Executes
       ↓
Remaining Balance → User Wallet (refund)
```

**Custody Address:** `HpFAMjQ5Vxp8J7HMvPGNEXZgWxdvxqd6MzXX8DdqqXA3`

---

## Why UNBOUND

### Key Differentiators

#### 1. **Orderbook Model (vs. AMM)**
Traditional DEXs use AMMs (Automated Market Makers) like Uniswap, which:
- Suffer from high slippage on large trades
- Provide inaccurate market depth
- Require passive liquidity providers to suffer impermanent loss

UNBOUND's orderbook:
- Accurate market depth visualization
- Competitive pricing without slippage penalties
- Professional trading experience familiar to traders
- Lower barriers to entry for market makers

#### 2. **MEV & Front-Running Protection**
99% of DEXs are vulnerable to sandwich attacks where:
- Attacker sees your pending order in mempool
- Attacker places order before you
- Your order fills at worse price
- Attacker's order fills after you, profiting from the spread

UNBOUND's commit-reveal protocol prevents this by:
- Hiding order details until after block is produced
- Guaranteeing execution at advertised price
- Industry-first security for orderbook DEX

#### 3. **Multi-Chain Unified Platform**
- Trade across BSC, Base, Solana from single interface
- No need to switch wallets or chains
- Real-time cross-chain pricing data
- Emerging token discovery across all networks

#### 4. **Professional Trading Tools**
UNBOUND supports advanced order types:
- Stop-loss orders (risk management)
- Take-profit orders (automated profit-taking)
- Ladder orders (market-making strategy)
- Post-only orders (maker-only execution)

Traditional DEXs only offer basic market/limit orders.

#### 5. **Early Token Discovery**
- Access emerging tokens before CEX listing
- Monitor trends in real-time
- First-mover advantage for new opportunities
- Real-time liquidity data from GeckoTerminal

#### 6. **Decentralized Custody**
- Users control private keys
- Assets never in platform custody (EVM chains)
- Transparent settlement on-chain
- Full audit trail via blockchain

---

## Getting Started

### Prerequisites

1. **Wallet**: MetaMask, Phantom, Coinbase Wallet, or compatible
2. **Tokens**: Assets in wallet on BSC, Base, or Solana
3. **Internet connection**: For real-time updates

### Create Your First Order

#### Step 1: Connect Wallet
- Click "Connect Wallet" button (top-right)
- Select your wallet provider
- Approve connection

#### Step 2: Select Trading Pair
- Tap "Markets" or use dropdown in trading view
- Search by symbol (e.g., "BTC/USDT")
- Or browse trending pairs

#### Step 3: Enter Order Details
- Choose side: **Buy** or **Sell**
- Choose order type: **Limit**, **Market**, or **Ladder**
- Enter amount (base token, quote, or %)
- (For Limit) Set price
- Set expiration

#### Step 4: Review & Confirm
- Check order summary
- Verify fees (0.1%)
- Click "Place Order"
- Approve in wallet if needed

#### Step 5: Monitor Execution
- View order in "Open Orders" tab
- Track fills in real-time
- See execution price + fees after fill

### Advanced Features

**Stop-Loss Orders**
- Set price below current → order triggers if price falls
- Risk management strategy

**Take-Profit Orders**
- Set price above current → order triggers if price rises
- Automated profit-taking

**Ladder Orders**
- Split order across multiple price levels
- Market-making strategy
- View ladder breakdown in order history

**Portfolio Tracking**
- Click "Portfolio" to view all holdings
- See P&L metrics (unrealized, realized, all-time)
- Monitor portfolio value in real-time

---

## Summary

**UNBOUND** is the professional's decentralized exchange. It combines:

✅ **Orderbook excellence** - Accurate pricing, deep liquidity visualization  
✅ **Front-running protection** - Commit-reveal protocol for MEV resistance  
✅ **Multi-chain access** - BSC, Base, Solana in one interface  
✅ **Advanced orders** - Stop-loss, take-profit, ladder, post-only  
✅ **Real-time data** - Sub-second price updates, live market intelligence  
✅ **Early discovery** - Access emerging tokens before major exchanges  
✅ **Full custody control** - Your keys, your coins, on-chain settlement  
✅ **Professional UX** - Desktop power, mobile convenience  

**Trade the way you were meant to. Trade on UNBOUND.**

---

## Support & Resources

- **Docs**: Visit the full API documentation
- **Support**: Contact us via email or chat
- **Twitter**: @UNBOUND_DEX
- **Discord**: Community server for traders and developers
