import { useState } from "react";
import { Menu, Globe, Settings, Check, Bell, Loader2, Flame, Blocks, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { MobileSettingsSheet } from "./MobileSettingsSheet";
import { MobileNotificationsSheet } from "./MobileNotificationsSheet";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { DynamicConnectButton, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork, useSetNetwork, type Network } from "@/hooks/useConnectedNetwork";
import { ChainIcon } from "@/components/ChainIcons";
import { useChainStats } from "@/hooks/useChainStats";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation, type LanguageCode, LANGUAGE_OPTIONS } from "@/i18n/i18n";

/* ── Wallet button ─────────────────────────────────────────────── */
function WalletButton() {
  const { primaryWallet, setShowDynamicUserProfile } = useDynamicContext();
  const { t } = useTranslation();

  if (primaryWallet) {
    const addr = primaryWallet.address ?? "";
    const short = addr.slice(0, 6) + "…" + addr.slice(-4);
    return (
      <button
        onClick={() => setShowDynamicUserProfile(true)}
        style={{
          backgroundColor: "rgba(245,197,24,0.10)",
          border: "1px solid rgba(245,197,24,0.35)",
          color: "#f5c518",
          fontWeight: 700,
          fontSize: 11,
          paddingLeft: 10,
          paddingRight: 10,
          height: 28,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Wallet style={{ width: 13, height: 13, flexShrink: 0, color: "#f5c518" }} />
        {short}
      </button>
    );
  }

  return (
    <DynamicConnectButton buttonContainerClassName="UNBOUND-connect-wrap">
      <button
        style={{
          backgroundColor: "#f5c518",
          color: "#000",
          fontWeight: 700,
          fontSize: 12,
          paddingLeft: 12,
          paddingRight: 14,
          height: 28,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Wallet style={{ width: 13, height: 13, flexShrink: 0 }} />
        {t('common.connect')}
      </button>
    </DynamicConnectButton>
  );
}

/* ── Floating gas + block badge (fixed, above bottom nav) ──────── */
export function FloatingChainStats() {
  const network = useConnectedNetwork();
  const { showGas, showBlock } = useSettings();
  const { gasGwei, blockNumber } = useChainStats(network);

  const hasGas   = showGas   && gasGwei     !== null;
  const hasBlock = showBlock && blockNumber !== null;

  if (!hasGas && !hasBlock) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 75,
        right: 12,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(15,15,15,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 24,
        padding: "6px 11px",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {hasGas && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 4,
            color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600,
            fontVariantNumeric: "tabular-nums", letterSpacing: "0.2px",
          }}
        >
          <Flame style={{ width: 11, height: 11, color: "#f97316", flexShrink: 0 }} />
          <span style={{ marginTop: 1 }}>{gasGwei}</span>
        </div>
      )}
      {hasGas && hasBlock && (
        <div style={{ width: 1, height: 11, backgroundColor: "rgba(255,255,255,0.15)" }} />
      )}
      {hasBlock && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 4,
            color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600,
            fontVariantNumeric: "tabular-nums", letterSpacing: "0.2px",
          }}
        >
          <Blocks style={{ width: 11, height: 11, color: "#22c55e", flexShrink: 0 }} />
          <span style={{ marginTop: 1 }}>{blockNumber}</span>
        </div>
      )}
    </div>
  );
}

/* ── Network config ────────────────────────────────────────────── */
type SupportedNetwork = Extract<Network, "bsc" | "base" | "solana">;

const NETWORKS: { id: SupportedNetwork; label: string; abbr: string; color: string; bg: string }[] = [
  { id: "bsc",    label: "BNB Chain", abbr: "BSC",  color: "#F3BA2F", bg: "rgba(243,186,47,0.15)"  },
  { id: "base",   label: "Base",      abbr: "BASE", color: "#0052FF", bg: "rgba(0,82,255,0.15)"    },
  { id: "solana", label: "Solana",    abbr: "SOL",  color: "#9945FF", bg: "rgba(153,69,255,0.15)"  },
];

const EVM_CHAIN_IDS: Partial<Record<SupportedNetwork, number>> = {
  bsc:  56,
  base: 8453,
};

/* ── Network pill + bottom sheet ── */
function NetworkPill() {
  const network = useConnectedNetwork() as SupportedNetwork;
  const setNetwork = useSetNetwork();
  const { primaryWallet } = useDynamicContext();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<SupportedNetwork | null>(null);

  const active = NETWORKS.find((n) => n.id === network) ?? NETWORKS[0];

  const pick = async (id: SupportedNetwork) => {
    if (id === network) { setOpen(false); return; }

    const net = NETWORKS.find((n) => n.id === id)!;

    setOpen(false);
    setNetwork(id);

    const chainId = EVM_CHAIN_IDS[id];

    if (!primaryWallet || !chainId) {
      toast.success(`Switched to ${net.label}`);
      return;
    }

    if ((primaryWallet as any).chain !== "EVM") {
      toast.success(`Switched to ${net.label}`);
      return;
    }

    setSwitching(id);
    const tid = toast.loading(`Switching to ${net.label}…`);
    try {
      await primaryWallet.connector.switchNetwork({ networkChainId: chainId });
      toast.success(`Switched to ${net.label}`, { id: tid });
    } catch (err) {
      console.warn("[NetworkPill] switchNetwork failed:", err);
      toast.error(`Failed to switch to ${net.label}`, { id: tid });
    } finally {
      setSwitching(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          padding: "0 4px",
          height: 28,
          display: "flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <ChainIcon id={active.id} size={14} />
        <span style={{ color: active.color, fontSize: 11, fontWeight: 700 }}>{active.abbr}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              backgroundColor: "var(--m-bg-1)",
              borderRadius: "20px 20px 0 0",
              border: "1px solid var(--m-bdr)",
              borderBottom: "none",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full mb-4" style={{ backgroundColor: "var(--m-bg-4)" }} />
              <div className="flex items-center gap-2 w-full px-5">
                <div
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: "linear-gradient(135deg,#F3BA2F,#9945FF)",
                    flexShrink: 0,
                  }}
                />
                <span className="text-[14px] font-semibold" style={{ color: "var(--m-fg)" }}>
                  {t('network.select')}
                </span>
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: "var(--m-bdr)", margin: "0 0 4px" }} />

            <div className="px-3 py-2 flex flex-col gap-2">
              {NETWORKS.map((net) => {
                const isActive = network === net.id;
                const isSwitchingThis = switching === net.id;
                return (
                  <button
                    key={net.id}
                    onClick={() => pick(net.id)}
                    disabled={switching !== null}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isActive ? net.bg : "var(--m-bg-2)",
                      border: isActive ? `1px solid ${net.color}40` : "1px solid var(--m-bg-4)",
                    }}
                  >
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: isActive ? net.bg : "var(--m-bg-3)",
                        border: isActive ? `1px solid ${net.color}50` : "1px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <ChainIcon id={net.id} size={20} />
                    </div>
                    <div className="flex flex-col leading-none gap-1 min-w-0 flex-1">
                      <span className="text-[14px] font-bold" style={{ color: isActive ? net.color : "var(--m-fg)" }}>
                        {net.label}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--m-fg-5)" }}>
                        {isSwitchingThis ? t('network.switching') : net.abbr}
                      </span>
                    </div>
                    {isSwitchingThis ? (
                      <Loader2
                        style={{ width: 18, height: 18, color: net.color, flexShrink: 0 }}
                        className="animate-spin"
                      />
                    ) : isActive ? (
                      <div
                        style={{
                          width: 18, height: 18, borderRadius: "50%",
                          backgroundColor: net.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Check style={{ width: 10, height: 10, color: "#fff" }} />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="px-4 pt-2 pb-4 shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="w-full h-11 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)" }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── Main component ────────────────────────────────────────────── */
interface Props {
  onMenuClick?: () => void;
  settingsOpen?: boolean;           // ✅ NEW: Settings open state
  onSettingsOpen?: () => void;      // ✅ NEW: Callback when settings should open
  onSettingsClose?: () => void;     // ✅ NEW: Callback when settings should close
}

export function MobileTopBar({ onMenuClick, settingsOpen = false, onSettingsOpen, onSettingsClose }: Props) {
  const { t, language, setLanguage } = useTranslation();
  const [langOpen,     setLangOpen]     = useState(false);
  const [notifsOpen,   setNotifsOpen]   = useState(false);
  const unreadCount = useNotificationStore((state) => state.notifications.filter((n) => !n.read).length);

  const activeCode = language.toUpperCase();

  const pick = (code: LanguageCode) => {
    setLanguage(code);
    setLangOpen(false);
  };

  return (
    <>
      <div
        className="flex items-center justify-between h-[52px] px-3 shrink-0"
        style={{ backgroundColor: "var(--m-bg-1)", borderBottom: "1px solid var(--m-bdr)" }}
      >
        {/* Left: menu + diamond logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--m-fg-3)" }}
          >
            <Menu className="w-5 h-5" />
          </button>

          <img 
            src="https://ndgywsfyfxrixhkfrtia.supabase.co/storage/v1/object/public/My%20logod/IMG_8705.png" 
            alt="Unbound"
            style={{ width: 22, height: 22, objectFit: "contain" }}
          />
        </div>

        {/* Right: wallet + lang + bell + settings */}
        <div className="flex items-center gap-1">
          <WalletButton />

          <button
            onClick={() => setLangOpen(true)}
            className="h-8 px-2 flex items-center gap-1 rounded-lg transition-colors"
            style={{ color: langOpen ? "#f5c518" : "var(--m-fg-4)" }}
          >
            <Globe style={{ width: 15, height: 15 }} />
            <span className="text-[11px] font-bold tracking-wide">{activeCode}</span>
          </button>

          <button
            onClick={() => setNotifsOpen(true)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: notifsOpen ? "#f5c518" : "var(--m-fg-4)" }}
          >
            <Bell style={{ width: 17, height: 17 }} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: "#f5c518", color: "#000" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSettingsOpen?.()}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: settingsOpen ? "#f5c518" : "var(--m-fg-4)" }}
          >
            <Settings style={{ width: 17, height: 17 }} />
          </button>
        </div>
      </div>

      {/* ── Language bottom sheet ── */}
      {langOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setLangOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              backgroundColor: "var(--m-bg-1)",
              borderRadius: "20px 20px 0 0",
              border: "1px solid var(--m-bdr)",
              borderBottom: "none",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
              maxHeight: "80vh",
            }}
          >
            <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full mb-4" style={{ backgroundColor: "var(--m-bg-4)" }} />
              <div className="flex items-center gap-2 w-full px-5">
                <Globe className="w-4 h-4" style={{ color: "var(--m-fg-4)" }} />
                <span className="text-[14px] font-semibold" style={{ color: "var(--m-fg)" }}>{t('header.language')}</span>
              </div>
            </div>
            <div style={{ height: 1, backgroundColor: "var(--m-bdr)", margin: "0 0 4px" }} />
            <div className="overflow-y-auto px-3 py-2 grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => pick(lang.code)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: isActive ? "rgba(245,197,24,0.10)" : "var(--m-bg-2)",
                      border: isActive ? "1px solid rgba(245,197,24,0.35)" : "1px solid var(--m-bg-4)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{
                        backgroundColor: isActive ? "rgba(245,197,24,0.18)" : "var(--m-bg-3)",
                        color: isActive ? "#f5c518" : "var(--m-fg-3)",
                      }}
                    >
                      {lang.code.toUpperCase()}
                    </div>
                    <div className="flex flex-col leading-none gap-0.5 min-w-0">
                      <span className="text-[13px] font-semibold truncate" style={{ color: isActive ? "#f5c518" : "var(--m-fg)" }}>
                        {lang.native}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--m-fg-5)" }}>{lang.name}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "#f5c518" }} />}
                  </button>
                );
              })}
            </div>
            <div className="px-4 pt-2 pb-4 shrink-0">
              <button
                onClick={() => setLangOpen(false)}
                className="w-full h-11 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)" }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </>
      )}

      <MobileSettingsSheet open={settingsOpen} onClose={() => onSettingsClose?.()} />
      <MobileNotificationsSheet
        open={notifsOpen}
        onClose={() => setNotifsOpen(false)}
      />
    </>
  );
}
