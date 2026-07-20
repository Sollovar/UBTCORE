import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useLiveMarket } from "@/hooks/useLiveMarket";
import { usePairs } from "@/hooks/usePairs";
import { useRealtimePairs, FlashMap } from "@/hooks/useRealtimePairs";
import { useTheme } from "@/contexts/ThemeContext";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { MobileTopBar } from "./components/MobileTopBar";
import { MobilePairHeader } from "./components/MobilePairHeader";
import { MobileChartView } from "./components/MobileChartView";
import { MobileOrderBookView } from "./components/MobileOrderBookView";
import { MobileTradesView } from "./components/MobileTradesView";
import { MobileBottomSection } from "./components/MobileBottomSection";
import { MobileBottomNav, NavTab } from "./components/MobileBottomNav";
import { MobileTradeView } from "./components/MobileTradeView";
import { MobileMarketSelectPanel } from "./components/MobileMarketSelectPanel";
import { MobileHamburgerMenu } from "./components/MobileHamburgerMenu";
import { MobileMarketsPage } from "./components/MobileMarketsPage";
import { FloatingChainStats } from "./components/MobileTopBar";
import { MobilePortfolioPage } from "./components/MobilePortfolioPage";
import { DynamicConnectButton, DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { Wallet, X } from "lucide-react";
import { useStore } from "@/stores/useStore";
import { useFillNotifications } from "@/hooks/useFillNotifications";
import { useTranslation } from "@/i18n/i18n";
import type { Network } from "@/utils/contracts";

type MainTab = "Chart" | "Order Book" | "Trades";

/* ── Map URL path → NavTab and back ────────────────────────────── */
function pathToTab(pathname: string): NavTab {
  if (pathname.startsWith("/markets"))  return "Markets";
  if (pathname.startsWith("/portfolio")) return "Portfolio";
  return "Trade"; // /trade and /trade/:pairId both resolve to Trade
}

function tabToPath(tab: NavTab, pairId?: string): string {
  if (tab === "Markets")   return "/markets";
  if (tab === "Portfolio") return "/portfolio";
  if (pairId)              return `/trade/${pairId}`;
  return "/trade";
}

/* ── Swipeable tabs config ──────────────────────────────────────── */
const SWIPE_TABS: NavTab[] = ["Markets", "Trade", "Portfolio"];
const SWIPE_THRESHOLD = 55;

/* ── Page dots indicator ────────────────────────────────────────── */
function PageDots({ activeTab }: { activeTab: NavTab }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 shrink-0"
      style={{ height: 20 }}
    >
      {SWIPE_TABS.map((tab) => {
        const active = tab === activeTab;
        return (
          <div
            key={tab}
            style={{
              width: active ? 18 : 5,
              height: 5,
              borderRadius: 99,
              backgroundColor: active ? "#f5c518" : "var(--m-bg-4)",
              transition: "width 0.25s ease, background-color 0.2s ease",
            }}
          />
        );
      })}
    </div>
  );
}

/* ── No-wallet bottom sheet ─────────────────────────────────────── */
function NoWalletSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(3px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center"
        style={{
          backgroundColor: "var(--m-bg-1)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--m-bdr)",
          borderBottom: "none",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="w-10 h-1 rounded-full mt-3 mb-6" style={{ backgroundColor: "var(--m-bg-4)" }} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ background: "rgba(245,197,24,0.10)", border: "2px solid rgba(245,197,24,0.25)" }}
        >
          <Wallet className="w-9 h-9" style={{ color: "#f5c518" }} />
        </div>

        <p className="text-[18px] font-bold mb-2" style={{ color: "var(--m-fg)" }}>
          Connect your wallet
        </p>
        <p className="text-[13px] text-center px-8 mb-8" style={{ color: "var(--m-fg-4)" }}>
          Connect to view your profile, balances and trade history.
        </p>

        <div className="w-full px-5 pb-2">
          <DynamicConnectButton buttonContainerClassName="UNBOUND-connect-wrap">
            <button
              style={{
                width: "100%",
                backgroundColor: "#f5c518",
                color: "#000",
                fontWeight: 700,
                fontSize: 15,
                height: 50,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                gap: 8,
              }}
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          </DynamicConnectButton>
        </div>
      </div>
    </>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
function MobileTradePageInner() {
  const { t } = useTranslation();
  const market = useLiveMarket();
  const { isDark } = useTheme();
  const { primaryWallet, setShowDynamicUserProfile } = useDynamicContext();
  const network = useStore(s => s.network) as Network;
  useFillNotifications(network);

  // Wouter location + URL params
  const [location, navigate] = useLocation();
  const params = useParams<{ pairId?: string }>();

  // Derive active tab from current URL path
  const navTab: NavTab = pathToTab(location);

  const [mainTab, setMainTab]             = useState<MainTab>("Chart");
  const [noWalletSheet, setNoWalletSheet] = useState(false);
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [settingsOpen, setSettingsOpen]   = useState(false);  // ✅ NEW: Settings state

  const setSelectedPair = useStore(s => s.setSelectedPair);
  const { pairs } = usePairs();

  // Single app-wide WebSocket for all-pair real-time price updates + flash
  const { flashMap } = useRealtimePairs();

  // Resolve current pair: prefer URL pairId, fall back to selectedPair in store, then first pair
  const urlPairId     = params.pairId ?? "";
  const selectedPair  = useStore(s => s.selectedPair);
  const currentPair   = pairs.find(p => p.id === urlPairId)
                     ?? selectedPair
                     ?? pairs[0]
                     ?? null;
  const currentPairId = currentPair?.id ?? "";

  // Keep global store in sync so useLiveMarket / useOrderbook track the right pair
  useEffect(() => {
    if (currentPair) setSelectedPair(currentPair);
  }, [currentPair?.id]);

  // Once pairs load and we're on /trade with no pairId in URL, push the default pair
  useEffect(() => {
    if (navTab === "Trade" && !urlPairId && currentPair?.id) {
      navigate(`/trade/${currentPair.id}`, { replace: true });
    }
  }, [navTab, urlPairId, currentPair?.id]);

  const currentSymbol = currentPair
    ? `${currentPair.baseToken.symbol}/${currentPair.quoteToken.symbol}`
    : "—/USDT";

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Swipe tracking refs — no re-renders during gesture
  const touchStartX      = useRef(0);
  const touchStartY      = useRef(0);
  const swiping          = useRef(false);
  const touchStartTarget = useRef<EventTarget | null>(null);

  function handleNavChange(tab: NavTab) {
    if (tab === "Home") {
      window.location.href = BASE + "/";
      return;
    }
    if (tab === "Account") {
      if (primaryWallet) {
        setShowDynamicUserProfile(true);
      } else {
        setNoWalletSheet(true);
      }
      return;
    }
    // Navigate to the proper URL for this tab
    // For Trade: use selectedPair from store so the correct pair opens
    if (tab === "Trade") {
      const tradeId = currentPairId || selectedPair?.id || "";
      navigate(tradeId ? `/trade/${tradeId}` : "/trade");
      return;
    }
    navigate(tabToPath(tab));
  }

  function selectPairAndNavigate(pairId: string) {
    // Used from swipe and bottom nav Trade button — updates store and navigates
    const found = pairs.find(p => p.id === pairId);
    if (found) setSelectedPair(found);
    navigate(`/trade/${pairId}`);
  }

  function selectPairInMarkets(pairId: string) {
    // Called from within the Markets tab — only update the store.
    // Do NOT navigate; the URL stays at /markets so navTab stays "Markets".
    // When the user later taps the Trade tab, currentPairId comes from selectedPair in the store.
    const found = pairs.find(p => p.id === pairId);
    if (found) setSelectedPair(found);
  }

  /* Swipe handlers — only active on swipeable tabs */
  function onTouchStart(e: React.TouchEvent) {
    if (!SWIPE_TABS.includes(navTab)) return;
    touchStartTarget.current = e.target;
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    swiping.current = false;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!SWIPE_TABS.includes(navTab)) return;

    let el = touchStartTarget.current as HTMLElement | null;
    while (el) {
      if (el.dataset?.noSwipe === "true") return;
      el = el.parentElement;
    }

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dy) > Math.abs(dx)) return;

    const idx = SWIPE_TABS.indexOf(navTab);
    if (dx < 0) {
      if (idx < SWIPE_TABS.length - 1) {
        const next = SWIPE_TABS[idx + 1];
        const tradeId = currentPairId || selectedPair?.id || "";
        navigate(next === "Trade" && tradeId ? `/trade/${tradeId}` : tabToPath(next));
      }
    } else {
      if (idx > 0) {
        const prev = SWIPE_TABS[idx - 1];
        const tradeId = currentPairId || selectedPair?.id || "";
        navigate(prev === "Trade" && tradeId ? `/trade/${tradeId}` : tabToPath(prev));
      }
    }
  }

  const isSwipeable = SWIPE_TABS.includes(navTab);

  return (
    <div
      data-mobile-theme={isDark ? "dark" : "light"}
      className="w-full flex flex-col overflow-hidden"
      style={{ height: "100dvh", backgroundColor: "var(--m-bg)", color: "var(--m-fg)" }}
    >
      {/* Hidden DynamicWidget — its portal renders the profile modal */}
      <div style={{ display: "none" }}>
        <DynamicWidget />
      </div>

      <MobileHamburgerMenu 
        open={menuOpen} 
        onClose={() => setMenuOpen(false)}
        onSettingsClick={() => setSettingsOpen(true)}  // ✅ NEW: Pass settings callback
      />

      {showMarketPanel && (
        <MobileMarketSelectPanel
          currentPairId={currentPairId}
          onClose={() => setShowMarketPanel(false)}
          onSelect={(pairId) => {
            setShowMarketPanel(false);
            const found = pairs.find(p => p.id === pairId);
            if (found) setSelectedPair(found);
            navigate(`/trade/${pairId}`);
          }}
        />
      )}

      <MobileTopBar 
        onMenuClick={() => setMenuOpen(true)}
        settingsOpen={settingsOpen}
        onSettingsOpen={() => setSettingsOpen(true)}
        onSettingsClose={() => setSettingsOpen(false)}
      />

      {/* Page dots — only visible on swipeable tabs */}
      {isSwipeable && (
        <div style={{ backgroundColor: "var(--m-bg)" }}>
          <PageDots activeTab={navTab} />
        </div>
      )}

      {/* Content area */}
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {navTab === "Trade" ? (
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 60 }}>
            <MobileTradeView
              market={market}
              currentSymbol={currentSymbol}
              pair={currentPair}
              onOpenMarketPanel={() => setShowMarketPanel(true)}
            />
            <div style={{ borderTop: "1px solid var(--m-bdr)" }}>
              <MobileBottomSection />
            </div>
          </div>

        ) : navTab === "Portfolio" ? (
          <MobilePortfolioPage />

        ) : navTab === "Markets" ? (
          <MobileMarketsPage
            market={market}
            currentPairId={currentPairId}
            flashMap={flashMap}
            onOpenMarketPanel={() => setShowMarketPanel(true)}
            onSelectPair={(pairId) => {
              selectPairInMarkets(pairId);
            }}
          />

        ) : (
          <>
            <MobilePairHeader
              market={market}
              currentSymbol={currentSymbol}
              pair={currentPair}
              flash={flashMap[currentPairId] ?? null}
              onOpenMarketPanel={() => setShowMarketPanel(true)}
            />

            <div
              className="flex items-center h-[40px] shrink-0"
              style={{ backgroundColor: "var(--m-bg-1)", borderBottom: "1px solid var(--m-bdr)" }}
            >
              {(["Chart", "Order Book", "Trades"] as MainTab[]).map((tab) => {
                const key = tab === "Chart" ? "chart" : tab === "Order Book" ? "orderBook" : "trades";
                return (
                  <button
                    key={tab}
                    onClick={() => setMainTab(tab)}
                    className="flex-1 h-full text-[13px] font-semibold transition-all relative"
                    style={{ color: mainTab === tab ? "var(--m-fg)" : "var(--m-fg-4)" }}
                  >
                    {t(`trade.${key}` as any)}
                    {mainTab === tab && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                        style={{ backgroundColor: "#f5c518", width: "60%" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ paddingBottom: 60 }}>
              <div className="flex-1 min-h-0 overflow-hidden">
                {mainTab === "Chart"      && <MobileChartView livePrice={market.price} />}
                {mainTab === "Order Book" && (
                  <MobileOrderBookView
                    market={market}
                    walletAddress={(primaryWallet as any)?.address as string | undefined}
                    pairId={currentPair?.id}
                    baseSymbol={currentPair?.baseToken?.symbol}
                    quoteSymbol={currentPair?.quoteToken?.symbol}
                  />
                )}
                {mainTab === "Trades"     && <MobileTradesView market={market} pairId={currentPair?.id} />}
              </div>
              <div
                className="shrink-0 overflow-y-auto"
                style={{ height: 160, borderTop: "1px solid var(--m-bdr)" }}
              >
                <MobileBottomSection />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating gas + block badge */}
      <FloatingChainStats />

      {/* No-wallet sheet */}
      <NoWalletSheet open={noWalletSheet} onClose={() => setNoWalletSheet(false)} />

      <MobileBottomNav
        activeNav={navTab}
        accountActive={noWalletSheet}
        onNavChange={handleNavChange}
      />
    </div>
  );
}

export function MobileTradePage() {
  return <MobileTradePageInner />;
}
