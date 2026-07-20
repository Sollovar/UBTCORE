import { useState, useRef } from "react";
import { Globe, Settings, Wallet, PieChart, Bell } from "lucide-react";
import { DynamicConnectButton, DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { PortfolioModal } from "./PortfolioModal";
import { DesktopNotificationsModal } from "./DesktopNotificationsModal";
import { DesktopSettingsModal } from "./DesktopSettingsModal";
import { DesktopLanguageModal } from "./DesktopLanguageModal";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useTranslation } from "@/i18n/i18n";

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

function MoreDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOpen(true);
  };

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="relative h-full flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <a
        href="#"
        className="hover:text-foreground transition-colors flex items-center text-muted-foreground font-medium"
      >
        {t('trade.more')} <span className="ml-1 text-[10px]">▼</span>
      </a>

      {open && (
        <div
          className="absolute left-0 top-full mt-0 z-50 flex flex-col py-1 rounded-lg border border-border"
          style={{ backgroundColor: "#161616", minWidth: 140 }}
        >
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {t('menu.docs')}
          </a>
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            API
          </a>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const { t, language } = useTranslation();
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const unreadCount = useNotificationStore((state) => state.notifications.filter((n) => !n.read).length);

  return (
    <>
      {/* Hidden DynamicWidget — its portal renders the profile modal */}
      <div style={{ display: "none" }}>
        <DynamicWidget />
      </div>

      <div className="flex items-center justify-between h-[44px] px-4 border-b border-[#1a1a1a] bg-[#0d0d0d] shrink-0 text-xs">
        <div className="flex items-center gap-6 h-full">
          <div className="flex items-center gap-2 font-bold text-lg tracking-wider text-primary">
            <img 
              src="https://ndgywsfyfxrixhkfrtia.supabase.co/storage/v1/object/public/My%20logod/IMG_8705.png" 
              alt="Unbound" 
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
            UNBOUND
          </div>
          <nav className="flex items-center gap-4 h-full text-muted-foreground font-medium">
            <a href="#" className="text-foreground flex items-center h-full border-b-2 border-primary">
              {t('nav.trade')}
            </a>
            <button 
              onClick={() => setPortfolioOpen(true)}
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <PieChart className="w-3.5 h-3.5" />
              {t('nav.portfolio')}
            </button>
            <MoreDropdown />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <WalletButton />
          <div className="w-[1px] h-4 bg-border mx-1" />
          <button 
            onClick={() => setLanguageOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Globe className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-wide">
              {language.toUpperCase()}
            </span>
          </button>
          <button 
            onClick={() => setNotifsOpen(true)}
            className="relative text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold bg-[#f5c518] text-black"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setSettingsOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PortfolioModal open={portfolioOpen} onClose={() => setPortfolioOpen(false)} />
      <DesktopNotificationsModal open={notifsOpen} onClose={() => setNotifsOpen(false)} />
      <DesktopSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DesktopLanguageModal open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  );
}
