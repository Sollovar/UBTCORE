import { useEffect, useState } from "react";
import {
  Globe, Twitter, MessageCircle, ExternalLink,
  Copy, CheckCheck, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import type { Pair } from "@/types";
import { fetchApi } from "@/services/api";
import { normalizeApiPair } from "@/utils/mockData";

/* ─────────────────────────────────────────────────────────────
   Raw token info as it arrives directly from the API.
   The indexer (server/index.js) stores this into base_token_info
   / quote_token_info columns in Postgres.
───────────────────────────────────────────────────────────── */
interface RawTokenInfo {
  address?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  description?: string;
  image_url?: string;
  image_large?: string;
  image_small?: string;
  image_thumb?: string;
  logo?: string;
  logo_uri?: string;
  websites?: string[];
  twitter_handle?: string;
  telegram_handle?: string;
  discord_url?: string;
  gt_score?: number;
  gt_verified?: boolean;
  coingecko_id?: string;
}

/* Parses a field that may be a plain object, a JSON string, or double-encoded */
function parseRawInfo(val: any): RawTokenInfo | null {
  if (!val) return null;
  if (typeof val === "object") return val as RawTokenInfo;
  if (typeof val === "string") {
    try {
      let parsed = JSON.parse(val);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (parsed && typeof parsed === "object") return parsed as RawTokenInfo;
    } catch {}
  }
  return null;
}

/* ── number formatting ───────────────────────────────────────── */
const SUBSCRIPT = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"];
function toSub(n: number) {
  return String(n).split("").map(c => SUBSCRIPT[parseInt(c)] ?? c).join("");
}
function fmtPrice(n: number): string {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  const after = n.toFixed(20).split(".")[1] ?? "";
  let z = 0;
  for (const c of after) { if (c === "0") z++; else break; }
  const sig = after.slice(z, z + 4).replace(/0+$/, "") || "0";
  return z < 4 ? n.toFixed(6) : `0.0${toSub(z - 1)}${sig}`;
}
function fmtUsd(n?: number): string {
  if (!n) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1)   return `$${n.toFixed(2)}`;
  const p = fmtPrice(n);
  return p.startsWith("$") ? p : `$${p}`;
}
function shortAddr(a: string): string {
  if (!a || a.length < 12) return a || "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/* ── copy button ────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); })}
      className="transition-opacity active:opacity-50 shrink-0"
    >
      {done
        ? <CheckCheck className="w-3.5 h-3.5" style={{ color: "#00c853" }} />
        : <Copy className="w-3.5 h-3.5" style={{ color: "var(--m-fg-5)" }} />
      }
    </button>
  );
}

/* ── explorer URLs ──────────────────────────────────────────── */
function tokenExplorer(net: string, addr: string) {
  if (!addr) return "";
  if (net === "bsc")      return `https://bscscan.com/token/${addr}`;
  if (net === "base")     return `https://basescan.org/token/${addr}`;
  if (net === "solana")   return `https://solscan.io/token/${addr}`;
  if (net === "ethereum") return `https://etherscan.io/token/${addr}`;
  return `https://etherscan.io/token/${addr}`;
}
function pairExplorer(net: string, addr: string) {
  if (!addr) return "";
  if (net === "bsc")      return `https://bscscan.com/address/${addr}`;
  if (net === "base")     return `https://basescan.org/address/${addr}`;
  if (net === "solana")   return `https://solscan.io/account/${addr}`;
  if (net === "ethereum") return `https://etherscan.io/address/${addr}`;
  return `https://etherscan.io/address/${addr}`;
}

/* ── reusable rows / chips ──────────────────────────────────── */
function SHead({ label }: { label: string }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest pt-4 pb-1.5" style={{ color: "var(--m-fg-5)" }}>{label}</p>;
}

function SRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--m-bdr)" }}>
      <span className="text-[12px]" style={{ color: "var(--m-fg-4)" }}>{label}</span>
      <span className="text-[12px] font-semibold" style={{ color: accent ?? "var(--m-fg)" }}>{value}</span>
    </div>
  );
}

function AddrRow({ label, value, net }: { label: string; value: string; net: string }) {
  if (!value) return null;
  const url = label.toLowerCase().includes("pool") ? pairExplorer(net, value) : tokenExplorer(net, value);
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--m-bdr)" }}>
      <span className="text-[11px] shrink-0 mr-2" style={{ color: "var(--m-fg-5)" }}>{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] truncate" style={{ color: "var(--m-fg-3)" }}>{shortAddr(value)}</span>
        <CopyBtn text={value} />
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="shrink-0 active:opacity-50">
            <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--m-fg-5)" }} />
          </a>
        )}
      </div>
    </div>
  );
}

function LinkChip({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium active:opacity-60"
      style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)", border: "1px solid var(--m-bdr)" }}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </a>
  );
}

/* ── token info card (base or quote) ────────────────────────── */
interface TokenCardProps {
  label: string;
  info: RawTokenInfo;
  net: string;
  defaultOpen?: boolean;
}
function TokenCard({ label, info, net, defaultOpen = false }: TokenCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const logo = info.image_url || info.image_large || info.image_small || info.image_thumb || info.logo || info.logo_uri || "";
  const homepage  = info.websites?.[0] ?? "";
  const twitter   = info.twitter_handle  ? `https://twitter.com/${info.twitter_handle}`  : "";
  const telegram  = info.telegram_handle ? `https://t.me/${info.telegram_handle}`        : "";
  const discord   = info.discord_url     ?? "";
  const hasLinks  = !!(homepage || twitter || telegram || discord);
  const hasAbout  = !!(info.description?.trim());

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ border: "1px solid var(--m-bdr)", backgroundColor: "var(--m-bg-2)" }}>
      {/* header — always visible */}
      <button
        className="w-full flex items-center gap-3 px-3 py-3 active:opacity-70"
        onClick={() => setOpen(v => !v)}
      >
        {logo ? (
          <img src={logo} alt={info.symbol} className="w-8 h-8 rounded-full object-cover shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ backgroundColor: "var(--m-bg-4)", color: "var(--m-fg)" }}>
            {info.symbol?.charAt(0) ?? "?"}
          </div>
        )}
        <div className="flex flex-col items-start flex-1 min-w-0">
          <span className="text-[13px] font-bold leading-tight" style={{ color: "var(--m-fg)" }}>{info.symbol}</span>
          <span className="text-[11px] truncate w-full" style={{ color: "var(--m-fg-4)" }}>{info.name}</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mr-1 shrink-0"
          style={{ backgroundColor: "var(--m-bg-4)", color: "var(--m-fg-5)" }}>{label}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--m-fg-5)" }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--m-fg-5)" }} />}
      </button>

      {open && (
        <div className="px-3 pb-3" style={{ borderTop: "1px solid var(--m-bdr)" }}>
          {/* description */}
          {hasAbout && (
            <p className="text-[12px] leading-relaxed pt-3 pb-1" style={{ color: "var(--m-fg-3)" }}>
              {info.description}
            </p>
          )}
          {!hasAbout && (
            <p className="text-[12px] pt-3 pb-1 italic" style={{ color: "var(--m-fg-5)" }}>
              No description available.
            </p>
          )}

          {/* links */}
          {hasLinks && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest pt-3 pb-2" style={{ color: "var(--m-fg-5)" }}>Links</p>
              <div className="flex flex-wrap gap-2">
                {homepage && <LinkChip icon={Globe}         label="Website"  href={homepage} />}
                {twitter  && <LinkChip icon={Twitter}       label="Twitter"  href={twitter}  />}
                {telegram && <LinkChip icon={MessageCircle} label="Telegram" href={telegram} />}
                {discord  && <LinkChip icon={MessageCircle} label="Discord"  href={discord}  />}
              </div>
            </>
          )}

          {/* address */}
          {info.address && (
            <div className="mt-3">
              <AddrRow label="Contract" value={info.address} net={net} />
            </div>
          )}

          {/* gt score badge */}
          {typeof info.gt_score === "number" && info.gt_score > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px]" style={{ color: "var(--m-fg-5)" }}>GeckoTerminal Score</span>
              <span className="text-[11px] font-bold" style={{ color: "#f5c518" }}>{info.gt_score.toFixed(1)}</span>
              {info.gt_verified && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: "rgba(0,200,83,0.15)", color: "#00c853" }}>Verified</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Props + component
══════════════════════════════════════════════════════════════ */
interface Props { pair: Pair | null; }

export function MobilePairInfoPanel({ pair }: Props) {
  // raw holds the direct API response so we can read base_token_info / quote_token_info
  // without relying on normalizeApiPair's merge (which may miss fields)
  const [raw, setRaw]         = useState<any | null>(null);
  const [detail, setDetail]   = useState<Pair | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!pair?.id) return;
    setDetail(pair);
    setRaw(null);
    setFetching(true);

    fetchApi<any>(`/api/v1/pairs/${pair.id}`)
      .then(apiResp => {
        setRaw(apiResp);
        setDetail(normalizeApiPair(apiResp));
      })
      .catch(() => { /* stay with pair data from list */ })
      .finally(() => setFetching(false));
  }, [pair?.id]);

  if (!pair) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--m-fg-5)" }}>
        <span className="text-[13px]">Select a pair to view info</span>
      </div>
    );
  }

  const p   = detail ?? pair;
  const net = p.network ?? "";

  // Gecko price should always be available from normalizeApiPair
  const geckoPrice = p.geckoPrice ?? 0;
  const geckoPriceUSD = p.geckoPriceUSD;
  const geckoChange = p.geckoPriceChange24h ?? 0;
  
  // Calculate quote token USD rate for high/low conversion
  const geckoRateDenom = p.geckoPrice ?? p.price ?? 0;
  const geckoRateNumer = p.geckoPriceUSD ?? p.priceUSD ?? 0;
  const quoteTokenUSDRate = (geckoRateDenom > 0 && geckoRateNumer > 0)
    ? geckoRateNumer / geckoRateDenom
    : 0;
  
  // Calculate 24h high/low with proper fallback using gecko price (like desktop UI)
  const high24h = p.geckoHigh24h ?? p.priceHigh24h ?? p.high24h ?? (geckoPrice > 0 ? geckoPrice * 1.018 : 0);
  const low24h  = p.geckoLow24h  ?? p.priceLow24h  ?? p.low24h  ?? (geckoPrice > 0 ? geckoPrice * 0.982 : 0);
  
  // Calculate USD equivalents for high/low
  const high24hUSD = high24h > 0 && quoteTokenUSDRate > 0 ? high24h * quoteTokenUSDRate : 0;
  const low24hUSD = low24h > 0 && quoteTokenUSDRate > 0 ? low24h * quoteTokenUSDRate : 0;
  
  // Exchange price (from actual fills on our backend) - may be 0 if no trades
  const exchangePrice = p.price;
  const exchangePriceUSD = p.priceUSD;
  const exchangeChange = p.priceChange24h ?? 0;

  // Pull raw token info — try the direct API field first, fall back to what
  // normalizeApiPair already merged into the token objects
  const baseInfo: RawTokenInfo = parseRawInfo(raw?.base_token_info) ?? {
    address:          p.baseToken.address,
    name:             p.baseToken.name,
    symbol:           p.baseToken.symbol,
    image_url:        p.baseToken.logo,
    description:      p.baseToken.about ?? "",
    websites:         p.baseToken.links?.homepage ?? [],
    twitter_handle:   p.baseToken.links?.twitter_screen_name ?? "",
    telegram_handle:  p.baseToken.links?.telegram_channel_identifier ?? "",
    discord_url:      p.baseToken.links?.discord_url ?? "",
  };

  const quoteInfo: RawTokenInfo = parseRawInfo(raw?.quote_token_info) ?? {
    address:          p.quoteToken.address,
    name:             p.quoteToken.name,
    symbol:           p.quoteToken.symbol,
    image_url:        p.quoteToken.logo,
    description:      p.quoteToken.about ?? "",
    websites:         p.quoteToken.links?.homepage ?? [],
    twitter_handle:   p.quoteToken.links?.twitter_screen_name ?? "",
    telegram_handle:  p.quoteToken.links?.telegram_channel_identifier ?? "",
    discord_url:      p.quoteToken.links?.discord_url ?? "",
  };

  return (
    <div className="overflow-y-auto h-full" style={{ paddingBottom: 80 }}>
      <div className="px-4">

        {/* ── header ── */}
        <div className="flex items-center justify-between pt-4 pb-3" style={{ borderBottom: "1px solid var(--m-bdr)" }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold" style={{ color: "var(--m-fg)" }}>
              {p.baseToken.symbol}
              <span style={{ color: "var(--m-fg-5)", fontWeight: 400 }}>/{p.quoteToken.symbol}</span>
            </span>
            <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>
              {p.dexName || "DEX"} · {net.toUpperCase()}
            </span>
          </div>
          {fetching && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--m-fg-5)" }} />}
        </div>

        {/* ── price ── */}
        <SHead label="Price" />
        <SRow label="Market Price (GeckoTerminal)" value={fmtPrice(geckoPrice)} />
        <SRow label="Market Price USD" value={fmtUsd(geckoPriceUSD)} />
        <SRow
          label="24h Change"
          value={`${geckoChange >= 0 ? "+" : ""}${geckoChange.toFixed(2)}%`}
          accent={geckoChange >= 0 ? "#00c853" : "#ff4d6a"}
        />
        <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--m-bdr)" }}>
          <span className="text-[12px]" style={{ color: "var(--m-fg-4)" }}>24h High</span>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[12px] font-semibold" style={{ color: "#00c853" }}>{fmtPrice(high24h)}</span>
            {high24hUSD > 0 && (
              <span className="text-[10px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>≈ {fmtUsd(high24hUSD)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--m-bdr)" }}>
          <span className="text-[12px]" style={{ color: "var(--m-fg-4)" }}>24h Low</span>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[12px] font-semibold" style={{ color: "#ff4d6a" }}>{fmtPrice(low24h)}</span>
            {low24hUSD > 0 && (
              <span className="text-[10px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>≈ {fmtUsd(low24hUSD)}</span>
            )}
          </div>
        </div>
        
        {/* ── exchange price (separate section) ── */}
        <SHead label="Exchange Price (Our Platform)" />
        <SRow label="Last Trade Price" value={exchangePrice > 0 ? fmtPrice(exchangePrice) : "0"} />
        {exchangePrice > 0 && exchangePriceUSD && (
          <>
            <SRow label="Last Trade USD" value={fmtUsd(exchangePriceUSD)} />
            <SRow
              label="24h Change"
              value={`${exchangeChange >= 0 ? "+" : ""}${exchangeChange.toFixed(2)}%`}
              accent={exchangeChange >= 0 ? "#00c853" : "#ff4d6a"}
            />
          </>
        )}

        {/* ── market ── */}
        <SHead label="Market" />
        <SRow label="Volume 24h" value={fmtUsd(p.volume24hUSD ?? p.volume24h)} />
        <SRow label="Liquidity"  value={fmtUsd(p.liquidityUSD ?? p.liquidity)} />
        {(p.marketCapUSD || p.marketCap) && (
          <SRow label="Market Cap" value={fmtUsd(p.marketCapUSD ?? p.marketCap)} />
        )}

        {/* ── pool address ── */}
        <SHead label="Pool" />
        <AddrRow label="Pool Address" value={p.pairAddress} net={net} />

        {/* ── token info cards ── */}
        <SHead label="Token Info" />
      </div>

      <div className="px-4 pt-1">
        <TokenCard label="Base"  info={baseInfo}  net={net} defaultOpen />
        <TokenCard label="Quote" info={quoteInfo} net={net} />
      </div>
    </div>
  );
}
