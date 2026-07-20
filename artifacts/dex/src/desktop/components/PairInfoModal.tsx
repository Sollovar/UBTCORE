import { useEffect, useState } from "react";
import {
  Globe, Twitter, MessageCircle, ExternalLink,
  Copy, CheckCheck, Loader2, ChevronDown, ChevronUp, X,
} from "lucide-react";
import type { Pair } from "@/types";
import { fetchApi } from "@/services/api";
import { normalizeApiPair } from "@/utils/mockData";

/* ─────────────────────────────────────────────────────────────
   Raw token info as it arrives directly from the API.
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

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); })}
      className="transition-opacity active:opacity-50 shrink-0"
    >
      {done
        ? <CheckCheck className="w-3.5 h-3.5" style={{ color: "#00c853" }} />
        : <Copy className="w-3.5 h-3.5" style={{ color: "#666" }} />
      }
    </button>
  );
}

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

function SHead({ label }: { label: string }) {
  return <p className="text-[11px] font-bold uppercase tracking-widest pt-5 pb-2 text-[#555]">{label}</p>;
}

function SRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "#1a1a1a" }}>
      <span className="text-[13px] text-[#666]">{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: accent ?? "#ccc" }}>{value}</span>
    </div>
  );
}

function AddrRow({ label, value, net }: { label: string; value: string; net: string }) {
  if (!value) return null;
  const url = label.toLowerCase().includes("pool") ? pairExplorer(net, value) : tokenExplorer(net, value);
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "#1a1a1a" }}>
      <span className="text-[12px] text-[#555] shrink-0 mr-3">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[12px] truncate text-[#888]">{shortAddr(value)}</span>
        <CopyBtn text={value} />
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="shrink-0 hover:opacity-70">
            <ExternalLink className="w-3.5 h-3.5 text-[#666]" />
          </a>
        )}
      </div>
    </div>
  );
}

function LinkChip({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium hover:bg-[#1a1a1a] transition-colors"
      style={{ backgroundColor: "#111", color: "#888", border: "1px solid #1e1e1e" }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </a>
  );
}

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
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: "1px solid #1a1a1a", backgroundColor: "#0a0a0a" }}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {logo ? (
          <img src={logo} alt={info.symbol} className="w-9 h-9 rounded-full object-cover shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 bg-[#1a1a1a] text-white">
            {info.symbol?.charAt(0) ?? "?"}
          </div>
        )}
        <div className="flex flex-col items-start flex-1 min-w-0">
          <span className="text-[14px] font-bold leading-tight text-white">{info.symbol}</span>
          <span className="text-[12px] truncate w-full text-[#666]">{info.name}</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full mr-2 shrink-0 bg-[#1a1a1a] text-[#888]">{label}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0 text-[#666]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-[#666]" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "#1a1a1a" }}>
          {hasAbout && (
            <p className="text-[13px] leading-relaxed pt-4 pb-2 text-[#888]">
              {info.description}
            </p>
          )}
          {!hasAbout && (
            <p className="text-[13px] pt-4 pb-2 italic text-[#555]">
              No description available.
            </p>
          )}

          {hasLinks && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest pt-4 pb-3 text-[#555]">Links</p>
              <div className="flex flex-wrap gap-2">
                {homepage && <LinkChip icon={Globe}         label="Website"  href={homepage} />}
                {twitter  && <LinkChip icon={Twitter}       label="Twitter"  href={twitter}  />}
                {telegram && <LinkChip icon={MessageCircle} label="Telegram" href={telegram} />}
                {discord  && <LinkChip icon={MessageCircle} label="Discord"  href={discord}  />}
              </div>
            </>
          )}

          {info.address && (
            <div className="mt-4">
              <AddrRow label="Contract" value={info.address} net={net} />
            </div>
          )}

          {typeof info.gt_score === "number" && info.gt_score > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <span className="text-[11px] text-[#666]">GeckoTerminal Score</span>
              <span className="text-[12px] font-bold text-[#f5c518]">{info.gt_score.toFixed(1)}</span>
              {info.gt_verified && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "rgba(0,200,83,0.15)", color: "#00c853" }}>Verified</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props { 
  pair: Pair | null; 
  open: boolean;
  onClose: () => void;
}

export function PairInfoModal({ pair, open, onClose }: Props) {
  const [raw, setRaw]         = useState<any | null>(null);
  const [detail, setDetail]   = useState<Pair | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!pair?.id || !open) return;
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
  }, [pair?.id, open]);

  if (!open) return null;

  if (!pair) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-[#000] border border-[#1e1e1e] rounded-xl p-8 max-w-md">
          <span className="text-[14px] text-[#666]">Select a pair to view info</span>
        </div>
      </div>
    );
  }

  const p   = detail ?? pair;
  const net = p.network ?? "";

  const geckoPrice = p.geckoPrice ?? 0;
  const geckoPriceUSD = p.geckoPriceUSD;
  const geckoChange = p.geckoPriceChange24h ?? 0;
  
  const high24h = p.priceHigh24h ?? p.high24h ?? (geckoPrice > 0 ? geckoPrice * 1.018 : 0);
  const low24h = p.priceLow24h ?? p.low24h ?? (geckoPrice > 0 ? geckoPrice * 0.982 : 0);
  
  const exchangePrice = p.price;
  const exchangePriceUSD = p.priceUSD;
  const exchangeChange = p.priceChange24h ?? 0;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#000] border border-[#1e1e1e] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex flex-col gap-1">
            <span className="text-[17px] font-bold text-white">
              {p.baseToken.symbol}
              <span className="text-[#666] font-normal">/{p.quoteToken.symbol}</span>
            </span>
            <span className="text-[12px] text-[#666]">
              {p.dexName || "DEX"} · {net.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {fetching && <Loader2 className="w-4 h-4 animate-spin text-[#666]" />}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              <X className="w-5 h-5 text-[#666]" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6" style={{ maxHeight: "calc(90vh - 80px)" }}>
          {/* Price */}
          <SHead label="Price" />
          <SRow label="Market Price (GeckoTerminal)" value={fmtPrice(geckoPrice)} />
          <SRow label="Market Price USD" value={fmtUsd(geckoPriceUSD)} />
          <SRow
            label="24h Change"
            value={`${geckoChange >= 0 ? "+" : ""}${geckoChange.toFixed(2)}%`}
            accent={geckoChange >= 0 ? "#00c853" : "#ff4d6a"}
          />
          <SRow label="24h High" value={fmtPrice(high24h)} />
          <SRow label="24h Low"  value={fmtPrice(low24h)} />
          
          {/* Exchange price */}
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

          {/* Market */}
          <SHead label="Market" />
          <SRow label="Volume 24h" value={fmtUsd(p.volume24hUSD ?? p.volume24h)} />
          <SRow label="Liquidity"  value={fmtUsd(p.liquidityUSD ?? p.liquidity)} />
          {(p.marketCapUSD || p.marketCap) && (
            <SRow label="Market Cap" value={fmtUsd(p.marketCapUSD ?? p.marketCap)} />
          )}

          {/* Pool address */}
          <SHead label="Pool" />
          <AddrRow label="Pool Address" value={p.pairAddress} net={net} />

          {/* Token info cards */}
          <SHead label="Token Info" />
          <div className="pt-2 pb-6">
            <TokenCard label="Base"  info={baseInfo}  net={net} defaultOpen />
            <TokenCard label="Quote" info={quoteInfo} net={net} />
          </div>
        </div>
      </div>
    </div>
  );
}
