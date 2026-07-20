import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import { useOrderCreation } from "@/hooks/useOrderCreation";
import { useStore } from "@/stores/useStore";
import { useBalances } from "@/hooks/useTokenBalance";
import { useSolanaDeposit } from "@/hooks/useSolanaDeposit";
import { getSolanaDepositMemo } from "@/utils/contracts";
import { useTranslation } from "@/i18n/i18n";
import { formatOrderValue } from "@/utils/formatters";
import type { Network } from "@/utils/contracts";

interface Props {
  market: LiveMarketState;
  symbol?: string;
}

type OrderTab = "Limit" | "Market" | "Ladder";

// Smart price formatting for ladder preview - avoids rounding small prices
function formatLadderPrice(price: number): string {
  if (price === 0) return "0";
  if (price >= 10000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  // Very small prices - use more decimals
  const str = price.toFixed(20);
  const afterDot = str.split(".")[1] ?? "";
  let zeros = 0;
  for (const c of afterDot) { if (c === "0") zeros++; else break; }
  return price.toFixed(Math.min(zeros + 4, 10));
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={onChange}>
      <div
        className="w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors rounded-sm"
        style={{
          borderColor: checked ? "#f5c518" : "#333",
          backgroundColor: checked ? "rgba(245,197,24,0.12)" : "transparent",
        }}
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <polyline points="1,3 3,5 7,1" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-[12px] text-[#888]">{label}</span>
    </label>
  );
}

const INPUT_ROW = "flex items-center bg-[#111] border border-[#222] focus-within:border-[#3a3a3a] px-3 h-[40px] gap-2 transition-colors rounded-full";

export function OrderEntryPanel({ market }: Props) {
  const { t } = useTranslation();
  const { primaryWallet } = useDynamicContext();
  const { createOrder, loading: submitting, error: submitError } = useOrderCreation();
  const selectedPair = useStore((s) => s.selectedPair);
  const pairs = useStore((s) => s.pairs);
  const activePair = selectedPair ?? pairs[0] ?? null;
  const walletAddress = (primaryWallet as any)?.address as string | undefined;
  
  // Solana deposit hook
  const { sendDeposit } = useSolanaDeposit(primaryWallet, walletAddress);

  const baseToken  = activePair?.baseToken?.symbol  ?? "BASE";
  const quoteToken = activePair?.quoteToken?.symbol ?? "USDT";

  // ── USD conversion rate calculation (same as mobile) ──
  const geckoRateDenom = activePair?.geckoPrice ?? activePair?.price ?? 0;
  const geckoRateNumer = activePair?.geckoPriceUSD ?? activePair?.priceUSD ?? 0;
  const quoteTokenUSDRate = (geckoRateDenom > 0 && geckoRateNumer > 0)
    ? geckoRateNumer / geckoRateDenom
    : 0;
  const usdPerQuote = quoteTokenUSDRate > 0 ? quoteTokenUSDRate : (
    (activePair?.priceUSD && activePair?.price && activePair.price > 0) 
      ? activePair.priceUSD / activePair.price 
      : 1
  );

  // ── Real wallet balances ──
  const pairNetwork = (activePair?.network ?? "bsc") as Network;
  const baseTokenAddr = activePair?.baseToken?.address ?? "";
  const quoteTokenAddr = activePair?.quoteToken?.address ?? "";
  const baseDec = activePair?.baseToken?.decimals ?? 18;
  const quoteDec = activePair?.quoteToken?.decimals ?? 18;
  const { baseBalance, quoteBalance, loading: balLoading, refetch: refetchBalances } = useBalances(
    baseTokenAddr,
    quoteTokenAddr,
    walletAddress,
    pairNetwork,
    baseDec,
    quoteDec,
  );

  const [tab, setTab]               = useState<OrderTab>("Limit");
  const [side, setSide]             = useState<"long" | "short">("long");
  const [limitPrice, setLimitPrice] = useState("");
  const [sliderPct, setSliderPct]   = useState(0);
  const [size, setSize]             = useState("");
  const [sizeUnit, setSizeUnit]     = useState<"base" | "quote">("base");
  const [postOnly, setPostOnly]     = useState(false);
  const [tpsl, setTpsl]             = useState(false);
  const [tpPrice, setTpPrice]       = useState("");
  const [slPrice, setSlPrice]       = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg]   = useState("");

  // Ladder state
  const [ladderStart, setLadderStart]   = useState("");
  const [ladderEnd, setLadderEnd]       = useState("");
  const [ladderLevels, setLadderLevels] = useState("10");
  
  // Expiration state
  const [expiration, setExpiration]   = useState('20');
  const [expirationType, setExpirationType] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Draggable slider
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Stable ref for slider calculations
  const sliderCalcRef = useRef({ 
    side: "long" as "long" | "short", 
    sizeUnit: "base" as "base" | "quote", 
    execPrice: 0, 
    quoteBalance: null as { formatted: string } | null | undefined, 
    baseBalance: null as { formatted: string } | null | undefined 
  });

  // Update ref on every render so slider effect sees fresh values
  sliderCalcRef.current = { 
    side, 
    sizeUnit, 
    execPrice: tab === "Limit" && limitPrice ? parseFloat(limitPrice) : market.price, 
    quoteBalance, 
    baseBalance 
  };

  // Switch away from Ladder tab if user switches to Buy
  useEffect(() => {
    if (side === "long" && tab === "Ladder") {
      setTab("Limit");
    }
  }, [side, tab]);

  // Slider percentage effect - auto-calculate size
  useEffect(() => {
    const { side: s, sizeUnit: u, execPrice: p, quoteBalance: qb, baseBalance: bb } = sliderCalcRef.current;
    if (sliderPct === 0) { setSize(""); return; }
    const qBal = parseFloat(qb?.formatted ?? "0") || 0;
    const bBal = parseFloat(bb?.formatted ?? "0") || 0;
    const price = p > 0 ? p : 0;
    if (price <= 0) return;
    const pct = sliderPct / 100;
    if (s === "long") {
      // spending quote to get base
      const spendQuote = qBal * pct;
      setSize(u === "quote" ? spendQuote.toFixed(2) : (spendQuote / price).toFixed(6));
    } else {
      // selling base
      const spendBase = bBal * pct;
      setSize(u === "base" ? spendBase.toFixed(6) : (spendBase * price).toFixed(2));
    }
  }, [sliderPct]);

  const computePct = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSliderPct(Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100));
  }, []);

  const onPtrDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    computePct(e.clientX);
  }, [computePct]);

  const onPtrMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) computePct(e.clientX);
  }, [computePct]);

  const onPtrUp = useCallback(() => { dragging.current = false; }, []);

  const displayPrice = market.price > 0
    ? market.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    : "—";

  // Ladder average price calculation
  const ladderAvgPrice = (() => {
    const s = parseFloat(ladderStart);
    const e = parseFloat(ladderEnd);
    return !isNaN(s) && !isNaN(e) && s > 0 && e > 0 ? (s + e) / 2 : null;
  })();

  // Live order value calculation
  const sizeNum   = parseFloat(size);
  const execPrice = tab === "Ladder"
    ? (ladderAvgPrice ?? market.price)
    : tab === "Limit" && limitPrice ? parseFloat(limitPrice) : market.price;
  const orderValueNum = !isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice) && execPrice > 0
    ? (sizeUnit === "base" ? sizeNum * execPrice : sizeNum)
    : 0;
  const orderValue = orderValueNum > 0
    ? formatOrderValue(orderValueNum) + " " + quoteToken
    : "N/A";
  const tokenEquiv = sizeUnit === "quote" && !isNaN(sizeNum) && sizeNum > 0 && execPrice > 0
    ? (sizeNum / execPrice).toFixed(6) + " " + baseToken
    : null;

  // Ladder preview calc
  const lStart  = parseFloat(ladderStart);
  const lEnd    = parseFloat(ladderEnd);
  const lLevels = parseInt(ladderLevels) || 0;
  const ladderValid = !isNaN(lStart) && !isNaN(lEnd) && lStart > 0 && lEnd > 0 && lLevels >= 2;
  const ladderInterval = ladderValid ? Math.abs(lEnd - lStart) / (lLevels - 1) : null;
  const ladderDir = ladderValid ? (lEnd > lStart ? "ascending" : "descending") : null;

  async function handleSubmit() {
    if (!primaryWallet) return;
    if (!activePair) {
      setSubmitStatus("error");
      setStatusMsg("No trading pair selected");
      return;
    }

    // Calculate expiration in minutes
    const expirationMinutes = expirationType === 'days'
      ? parseInt(expiration) * 24 * 60
      : expirationType === 'hours'
      ? parseInt(expiration) * 60
      : parseInt(expiration);

    // Determine price string
    let priceStr: string;
    if (tab === "Market") {
      priceStr = market.price.toString();
    } else if (tab === "Limit") {
      priceStr = limitPrice || market.price.toString();
    } else {
      priceStr = ladderStart || market.price.toString();
    }

    // Determine amount
    let amountStr: string;
    if (!size || parseFloat(size) <= 0) {
      setSubmitStatus("error");
      setStatusMsg("Enter a valid amount");
      return;
    }

    if (sizeUnit === "quote") {
      const px = parseFloat(priceStr);
      if (px > 0) {
        amountStr = (parseFloat(size) / px).toFixed(8);
      } else {
        amountStr = size;
      }
    } else {
      amountStr = size;
    }

    setSubmitStatus("idle");
    setStatusMsg("");

    const network = (activePair.network as Network) || "bsc";
    const orderSide = side === "long" ? "buy" : "sell";

    // ── Solana: deposit to custodial address first ─────────────────────────────
    let depositTxHash: string | undefined;
    let depositMemo: string | undefined;
    let depositType: "sol" | "spl" | undefined;
    let depositTokenMint: string | undefined;
    let depositAmount: string | undefined;

    if (network === "solana") {
      const depositToken = orderSide === "buy" ? activePair.quoteToken : activePair.baseToken;
      depositType = depositToken.symbol?.toLowerCase() === "sol" ? "sol" : "spl";
      depositTokenMint = depositType === "spl" ? depositToken.address : undefined;
      
      // Calculate deposit amount based on side
      const priceNum = parseFloat(priceStr);
      depositAmount = orderSide === "buy"
        ? (parseFloat(amountStr) * priceNum).toString()
        : amountStr;
      
      depositMemo = walletAddress ? getSolanaDepositMemo(walletAddress) : undefined;

      const depositResult = await sendDeposit(
        depositAmount,
        depositType,
        depositTokenMint,
        depositMemo,
      );

      if (!depositResult.success) {
        setSubmitStatus("error");
        setStatusMsg(depositResult.error ?? "Deposit to custody failed");
        setTimeout(() => setSubmitStatus("idle"), 5000);
        return;
      }
      depositTxHash = depositResult.txId;
    }
    // ──────────────────────────────────────────────────────────────────────────

    const result = await createOrder({
      pairId: activePair.id,
      side: orderSide,
      orderType: tab === "Market" ? "market" : "limit",
      price: priceStr,
      amount: amountStr,
      network,
      expiration: expirationMinutes || 20,
      advanced: postOnly ? "postOnly" : "none",
      triggerPrice: tpsl && tpPrice ? tpPrice : undefined,
      isLadder: tab === "Ladder" && ladderValid,
      ladderConfig: tab === "Ladder" && ladderValid ? {
        priceStart: ladderStart,
        priceEnd: ladderEnd,
        levels: lLevels,
      } : undefined,
      // Pass Solana deposit params if applicable
      ...(network === "solana" ? {
        depositTxHash,
        depositMemo,
        depositType,
        depositTokenMint,
        depositAmount,
      } : {}),
    });

    if (result.success) {
      setSubmitStatus("success");
      setStatusMsg("Order placed!");
      setSize("");
      setLimitPrice("");
      setSliderPct(0);
      setTpPrice("");
      setSlPrice("");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } else {
      setSubmitStatus("error");
      setStatusMsg(result.error || "Order failed");
      setTimeout(() => setSubmitStatus("idle"), 5000);
    }
  }

  const isConnected = !!primaryWallet;
  const canSubmit = isConnected && !submitting && activePair != null;

  const buttonBg = tab === "Ladder"
    ? "#a78bfa"
    : submitStatus === "success"
    ? "#00c853"
    : submitStatus === "error"
    ? "#ff4d6a"
    : "#f5c518";

  const buttonLabel = (() => {
    if (!isConnected) return t('trade.connectWallet');
    if (submitting) return t('trade.placingOrder');
    if (submitStatus === "success") return statusMsg;
    if (submitStatus === "error") return statusMsg;
    if (tab === "Ladder") return "Place Ladder Order";
    return `${side === "long" ? t('common.buy') : t('common.sell')}`;
  })();

  return (
    <div className="flex flex-col bg-[#000000]">
      {/* Tabs — 3-column grid so Market is always truly centered */}
      <div className="grid grid-cols-3 h-[38px] px-3 border-b border-[#1a1a1a] bg-[#000000] shrink-0">
        <button
          onClick={() => setTab("Limit")}
          className="h-full flex items-center text-[13px] font-semibold transition-colors justify-start"
          style={{
            color: tab === "Limit" ? "#fff" : "#555",
            borderBottom: tab === "Limit" ? "2px solid #f5c518" : "2px solid transparent",
          }}
        >
          {t('trade.limit')}
        </button>
        <button
          onClick={() => setTab("Market")}
          className="h-full flex items-center text-[13px] font-semibold transition-colors justify-center"
          style={{
            color: tab === "Market" ? "#fff" : "#555",
            borderBottom: tab === "Market" ? "2px solid #f5c518" : "2px solid transparent",
          }}
        >
          {t('trade.market')}
        </button>
        <button
          onClick={() => side === "short" && setTab("Ladder")}
          disabled={side === "long"}
          className="h-full flex items-center text-[13px] font-semibold transition-colors justify-end disabled:cursor-not-allowed"
          style={{
            color: tab === "Ladder" ? "#a78bfa" : side === "long" ? "#333" : "#555",
            borderBottom: tab === "Ladder" ? "2px solid #a78bfa" : "2px solid transparent",
            opacity: side === "long" ? 0.4 : 1,
          }}
          title={side === "long" ? "Ladder orders only available for selling" : ""}
        >
          {t('trade.ladder')}
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Available */}
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#555]">{t('trade.availToTrade')}</span>
          <span className="text-[#888]">
            {balLoading ? (
              "Loading..."
            ) : (
              <>
                {side === "long" 
                  ? (quoteBalance?.formatted ? parseFloat(quoteBalance.formatted).toFixed(4) : "0.00")
                  : (baseBalance?.formatted ? parseFloat(baseBalance.formatted).toFixed(4) : "0.00")
                }{" "}
                {side === "long" ? quoteToken : baseToken}
              </>
            )}
          </span>
        </div>

        {/* Price input — Limit only */}
        {tab === "Limit" && (
          <div className="flex flex-col gap-1">
            <div className={INPUT_ROW}>
              <span className="text-[11px] font-semibold text-[#555] shrink-0">{t('trade.price')}</span>
              <div className="w-px h-3.5 bg-[#222] shrink-0" />
              <input
                type="text"
                placeholder={displayPrice}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="bg-transparent outline-none flex-1 tabular-nums text-white text-[13px] font-medium w-0 text-right"
              />
              <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
            </div>
            {limitPrice && parseFloat(limitPrice) > 0 && usdPerQuote > 0 && (
              <div className="flex justify-end px-1">
                <span className="text-[10px] text-[#666] tabular-nums">
                  ≈ ${(parseFloat(limitPrice) * usdPerQuote).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ladder inputs */}
        {tab === "Ladder" && (
          <div className="flex flex-col gap-2">
            {[
              { label: "Start", val: ladderStart, set: setLadderStart, ph: "Price start" },
              { label: "End",   val: ladderEnd,   set: setLadderEnd,   ph: "Price end"   },
            ].map(({ label, val, set, ph }) => (
              <div key={label} className={INPUT_ROW} style={{ borderColor: "rgba(167,139,250,0.3)" }}>
                <span className="text-[11px] font-semibold shrink-0" style={{ color: "#a78bfa" }}>{label}</span>
                <div className="w-px h-3.5 bg-[#222] shrink-0" />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={ph}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
                />
                <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
              </div>
            ))}
            <div className={INPUT_ROW} style={{ borderColor: "rgba(167,139,250,0.3)" }}>
              <span className="text-[11px] font-semibold shrink-0" style={{ color: "#a78bfa" }}>Levels</span>
              <div className="w-px h-3.5 bg-[#222] shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 10"
                value={ladderLevels}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  const n = Math.min(30, Math.max(1, Number(v) || 1));
                  setLadderLevels(v === "" ? "" : String(n));
                }}
                className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
              />
              <span className="text-[11px] text-[#555] shrink-0">/ 30</span>
            </div>
          </div>
        )}

        {/* Buy / Sell toggle */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setSide("long")}
            className="flex-1 py-2 text-[13px] font-bold transition-all rounded-full"
            style={{
              backgroundColor: side === "long" ? "#f5c518" : "transparent",
              color: side === "long" ? "#000" : "#555",
              border: `1px solid ${side === "long" ? "#f5c518" : "#222"}`,
            }}
          >
            {t('common.buy')}
          </button>
          <button
            onClick={() => setSide("short")}
            className="flex-1 py-2 text-[13px] font-bold transition-all rounded-full"
            style={{
              backgroundColor: side === "short" ? "#ff4d6a" : "transparent",
              color: side === "short" ? "#fff" : "#555",
              border: `1px solid ${side === "short" ? "#ff4d6a" : "#222"}`,
            }}
          >
            {t('common.sell')}
          </button>
        </div>

        {/* Size input */}
        <div className="flex flex-col gap-1">
          <div className={INPUT_ROW}>
            <span className="text-[11px] font-semibold text-[#555] shrink-0">{t('trade.size')}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={size}
              onChange={(e) => setSize(e.target.value.replace(/[^0-9.]/g, ""))}
              className="bg-transparent outline-none flex-1 text-white text-right text-[13px] w-0 placeholder:text-[#333]"
            />
            <div className="w-px h-3.5 bg-[#222] shrink-0" />
            <button
              onClick={() => { setSizeUnit(u => u === "base" ? "quote" : "base"); setSize(""); }}
              className="flex items-center gap-0.5 text-[11px] font-semibold shrink-0 transition-colors rounded px-1 py-0.5 hover:bg-[#1e1e1e]"
              style={{ color: sizeUnit === "quote" ? "#f5c518" : "#888" }}
            >
              {sizeUnit === "base" ? baseToken : quoteToken} <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          {tokenEquiv && (
            <div className="flex justify-end items-center gap-1 px-1">
              <span className="text-[11px] text-[#555]">≈</span>
              <span className="text-[11px] font-medium text-[#f5c518]">{tokenEquiv}</span>
            </div>
          )}
          {!isNaN(sizeNum) && sizeNum > 0 && execPrice > 0 && usdPerQuote > 0 && (
            <div className="flex justify-end items-center gap-1 px-1">
              <span className="text-[10px] text-[#666]">≈</span>
              <span className="text-[10px] font-medium text-[#666] tabular-nums">
                ${(sizeUnit === "base" ? sizeNum * execPrice * usdPerQuote : sizeNum * usdPerQuote).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
          )}
        </div>

        {/* Slider — draggable */}
        <div className="px-0.5 pt-1 pb-1">
          <div
            ref={trackRef}
            className="relative flex items-center cursor-pointer select-none rounded-full"
            style={{ height: 20 }}
            onPointerDown={onPtrDown}
            onPointerMove={onPtrMove}
            onPointerUp={onPtrUp}
            onPointerCancel={onPtrUp}
          >
            <div className="absolute left-0 right-0 rounded-full" style={{ height: 3, top: "50%", transform: "translateY(-50%)", backgroundColor: "#1a1a1a" }} />
            <div className="absolute left-0 rounded-full" style={{ height: 3, top: "50%", transform: "translateY(-50%)", width: `${sliderPct}%`, backgroundColor: "#f5c518" }} />
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 8, height: 8,
                  top: "50%", transform: "translate(-50%, -50%)",
                  left: `${pct}%`,
                  backgroundColor: sliderPct >= pct ? "#f5c518" : "#2a2a2a",
                  border: "2px solid #0a0a0a",
                }}
              />
            ))}
            <div
              className="absolute rounded-full pointer-events-none shadow"
              style={{
                width: 14, height: 14,
                top: "50%", transform: "translate(-50%, -50%)",
                left: `${sliderPct}%`,
                backgroundColor: "#f5c518",
                border: "2.5px solid #0a0a0a",
                boxShadow: "0 0 0 3px rgba(245,197,24,0.18)",
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-[#444]">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setSliderPct(pct)}
                className="transition-colors"
                style={{ color: sliderPct === pct ? "#f5c518" : "#444" }}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Checkboxes + TP/SL — hidden in Ladder mode */}
        {tab !== "Ladder" && (
          <div className="flex flex-col gap-2.5">
            <Check checked={postOnly} onChange={() => setPostOnly(!postOnly)} label={t('trade.postOnly')} />
            <Check checked={tpsl} onChange={() => setTpsl(!tpsl)} label="Take Profit / Stop Loss" />
            {tpsl && (
              <div className="flex flex-col gap-2 mt-0.5">
                <div className={INPUT_ROW}>
                  <span className="text-[11px] font-semibold text-[#555] shrink-0">TP</span>
                  <div className="w-px h-3.5 bg-[#222] shrink-0" />
                  <input
                    type="text"
                    placeholder="Take Profit price"
                    value={tpPrice}
                    onChange={(e) => setTpPrice(e.target.value)}
                    className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
                  />
                  <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
                </div>
                <div className={INPUT_ROW}>
                  <span className="text-[11px] font-semibold text-[#555] shrink-0">SL</span>
                  <div className="w-px h-3.5 bg-[#222] shrink-0" />
                  <input
                    type="text"
                    placeholder="Stop Loss price"
                    value={slPrice}
                    onChange={(e) => setSlPrice(e.target.value)}
                    className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
                  />
                  <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expiration Control */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#555]">Expires In</span>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="20"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="flex-1 bg-[#111] border border-[#222] px-3 h-[40px] rounded-full text-[13px] text-white text-right outline-none focus:border-[#3a3a3a] transition-colors"
            />
            <button
              type="button"
              onClick={() => setExpirationType('minutes')}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded transition-all"
              style={{
                backgroundColor: expirationType === 'minutes' ? "#f5c518" : "#111",
                color: expirationType === 'minutes' ? "#000" : "#555",
                border: expirationType === 'minutes' ? "1px solid #f5c518" : "1px solid #222",
              }}
            >
              Min
            </button>
            <button
              type="button"
              onClick={() => setExpirationType('hours')}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded transition-all"
              style={{
                backgroundColor: expirationType === 'hours' ? "#f5c518" : "#111",
                color: expirationType === 'hours' ? "#000" : "#555",
                border: expirationType === 'hours' ? "1px solid #f5c518" : "1px solid #222",
              }}
            >
              Hour
            </button>
            <button
              type="button"
              onClick={() => setExpirationType('days')}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded transition-all"
              style={{
                backgroundColor: expirationType === 'days' ? "#f5c518" : "#111",
                color: expirationType === 'days' ? "#000" : "#555",
                border: expirationType === 'days' ? "1px solid #f5c518" : "1px solid #222",
              }}
            >
              Day
            </button>
          </div>
        </div>

        {/* Order stats - always shown */}
        <div className="flex flex-col gap-2">
          {/* Order Value */}
          <div className="flex items-start justify-between">
            <span className="text-[12px] text-[#555]">{t('trade.orderValue')}</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[12px] text-[#888]">
                {tab === "Ladder" && ladderAvgPrice
                  ? `~${orderValue} (avg @ ${ladderAvgPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                  : orderValue}
              </span>
              {!isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice) && execPrice > 0 && usdPerQuote > 0 && (
                <span className="text-[10px] text-[#666] tabular-nums">
                  ≈ ${(sizeUnit === "base" ? sizeNum * execPrice * usdPerQuote : sizeNum * usdPerQuote).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              )}
            </div>
          </div>
          {/* Slippage */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#555]">{t('trade.slippage')}</span>
            <span className="text-[12px] text-[#f5c518]">
              {tab === "Ladder" ? "Spread across levels" : "Est: 0% / Max: 0.50%"}
            </span>
          </div>
        </div>

        {/* Ladder preview */}
        {tab === "Ladder" && (
          <div
            className="rounded-lg px-3 py-3 flex flex-col gap-2"
            style={{ backgroundColor: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="0"   y="7"   width="2" height="3"  rx="0.5" fill="#a78bfa" />
                <rect x="2.5" y="4.5" width="2" height="5.5" rx="0.5" fill="#a78bfa" opacity="0.7" />
                <rect x="5"   y="2"   width="2" height="8"  rx="0.5" fill="#a78bfa" opacity="0.5" />
                <rect x="7.5" y="0"   width="2" height="10" rx="0.5" fill="#a78bfa" opacity="0.3" />
              </svg>
              <span className="text-[11px] font-bold tracking-wide" style={{ color: "#a78bfa" }}>Ladder Preview</span>
            </div>

            {ladderValid ? (
              <>
                {[
                  ["Child Orders",    String(lLevels),                              "#a78bfa"],
                  ["Price Interval",  `${formatLadderPrice(ladderInterval!)} ${quoteToken}`, "#888"],
                  ["Range",           `${formatLadderPrice(Math.min(lStart,lEnd))} → ${formatLadderPrice(Math.max(lStart,lEnd))}`, "#888"],
                  ["Fill Direction",  ladderDir === "ascending" ? "↑ Low → High" : "↓ High → Low",
                                      ladderDir === "ascending" ? "#00c8a0" : "#ff4d6a"],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#555]">{label}</span>
                    <span className="text-[12px] font-medium" style={{ color }}>{value}</span>
                  </div>
                ))}
                <div className="flex items-end gap-[2px] mt-1" style={{ height: 20 }}>
                  {Array.from({ length: Math.min(lLevels, 20) }).map((_, i) => {
                    const total = Math.min(lLevels, 20);
                    const h = ladderDir === "ascending" ? ((i + 1) / total) * 100 : ((total - i) / total) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{ height: `${h}%`, backgroundColor: "#a78bfa", opacity: 0.3 + (i / total) * 0.6 }}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-center py-1 text-[#444]">Enter price range &amp; levels to preview</p>
            )}
          </div>
        )}

        {/* Submit / Connect button */}
        {!isConnected ? (
          <div style={{ width: "100%", marginTop: 4 }}>
            <DynamicConnectButton buttonContainerClassName="UNBOUND-panel-connect">
              <button
                style={{
                  width: "100%",
                  backgroundColor: "#f5c518",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 13,
                  height: 40,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  border: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <Wallet style={{ width: 14, height: 14, flexShrink: 0 }} />
                {t('trade.connectWallet')}
              </button>
            </DynamicConnectButton>
          </div>
        ) : (
          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full font-bold py-3 text-[14px] transition-colors mt-1 disabled:opacity-60"
            style={{
              backgroundColor: buttonBg,
              color: tab === "Ladder" || submitStatus === "error" ? "#fff" : "#000",
              borderRadius: 8,
            }}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
