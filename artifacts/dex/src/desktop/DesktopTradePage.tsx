import { useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useLiveMarket } from "@/hooks/useLiveMarket";
import { usePairs } from "@/hooks/usePairs";
import { useStore } from "@/stores/useStore";
import { useFillNotifications } from "@/hooks/useFillNotifications";
import type { Network } from "@/utils/contracts";
import { TopNav } from "./components/TopNav";
import { TradingPairHeader } from "./components/TradingPairHeader";
import { DesktopChartView } from "./components/DesktopChartView";
import { OrderBook } from "./components/OrderBook";
import { OrderEntryPanel } from "./components/OrderEntryPanel";
import { TickerBar } from "./components/TickerBar";
import { BottomPanel } from "./components/BottomPanel";

const CHART_H = "calc(100vh - 142px)";
const SCROLL_STEP = 120;

export function DesktopTradePage() {
  const market = useLiveMarket();
  const [location, navigate] = useLocation();
  const params = useParams<{ pairId?: string }>();
  const { pairs } = usePairs();
  const setSelectedPair = useStore((s) => s.setSelectedPair);
  const selectedPair = useStore((s) => s.selectedPair);
  const walletAddress = useStore(s => s.walletAddress);
  const network = useStore(s => s.network) as Network;
  
  // Enable fill notifications for desktop
  useFillNotifications(network);

  // Resolve current pair: prefer URL pairId, fall back to selectedPair in store, then first pair
  const urlPairId = params.pairId ?? "";
  const currentPair = pairs.find((p) => p.id === urlPairId) ?? selectedPair ?? pairs[0] ?? null;
  const activePairId = currentPair?.id;
  // Keep global store in sync so useLiveMarket / useOrderbook track the right pair
  useEffect(() => {
    if (currentPair) setSelectedPair(currentPair);
  }, [currentPair?.id]);

  // Once pairs load and we're on /trade with no pairId in URL, push the default pair
  useEffect(() => {
    if (!urlPairId && currentPair?.id) {
      navigate(`/trade/${currentPair.id}`, { replace: true });
    }
  }, [urlPairId, currentPair?.id]);

  const chartScrollRef = useRef<HTMLDivElement>(null);
  const orderEntryScrollRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const target = activeScrollRef.current ?? chartScrollRef.current;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        target?.scrollBy({ top: SCROLL_STEP, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        target?.scrollBy({ top: -SCROLL_STEP, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-sm text-white select-none" style={{ background: "#0d0d0d" }}>
      <TopNav />
      <TradingPairHeader market={market} />

      <div className="flex-1 min-h-0 flex gap-2 p-2 overflow-hidden">

        {/* LEFT: chart card */}
        <div
          className="flex flex-col flex-1 min-w-0 overflow-hidden"
          style={{
            background: "#000000",
            borderRadius: 12,
            border: "1px solid #1e1e1e",
            boxShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
          onMouseDown={() => { activeScrollRef.current = chartScrollRef.current; }}
        >
          <div ref={chartScrollRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <div style={{ height: CHART_H, minHeight: 400, flexShrink: 0 }}>
              <DesktopChartView 
                livePrice={market.price} 
                pairId={activePairId}
                pairAddress={currentPair?.pairAddress}
                network={currentPair?.network}
                quoteTokenSymbol={currentPair?.quoteToken?.symbol}
                quoteTokenAddress={currentPair?.quoteToken?.address}
                priceUSD={currentPair?.priceUSD}
                priceChange24h={currentPair?.priceChange24h}
              />
            </div>
            <div style={{ minHeight: 220, flexShrink: 0 }}>
              <BottomPanel />
            </div>
          </div>
        </div>

        {/* MIDDLE: order book card */}
        <div
          className="flex flex-col overflow-hidden shrink-0"
          style={{
            width: 272,
            background: "#000000",
            borderRadius: 12,
            border: "1px solid #1e1e1e",
            boxShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          <OrderBook 
            market={market} 
            walletAddress={walletAddress ?? undefined}
            pairId={activePairId}
            baseSymbol={currentPair?.baseToken?.symbol}
            quoteSymbol={currentPair?.quoteToken?.symbol}
          />
        </div>

        {/* RIGHT: order entry card */}
        <div
          className="flex flex-col overflow-hidden shrink-0"
          style={{
            width: 272,
            background: "#000000",
            borderRadius: 12,
            border: "1px solid #1e1e1e",
            boxShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
          onMouseDown={() => { activeScrollRef.current = orderEntryScrollRef.current; }}
        >
          <div ref={orderEntryScrollRef} className="flex flex-col h-full overflow-y-auto no-scrollbar">
            <OrderEntryPanel market={market} symbol="BTCUSDT" />
          </div>
        </div>

      </div>

      <TickerBar market={market} />
    </div>
  );
}
