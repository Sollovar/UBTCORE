import {
  X,
  BarChart2,
  TrendingUp,
  Wallet,
  BookOpen,
  HelpCircle,
  Settings,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onSettingsClick?: () => void;  // ✅ NEW: Callback to open settings sheet
}

const SOCIALS = [
  {
    id: "discord",
    color: "#5865f2",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
      </svg>
    ),
  },
  {
    id: "twitter",
    color: "#e7e7e7",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: "telegram",
    color: "#229ed9",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
  {
    id: "github",
    color: "#aaa",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
];

export function MobileHamburgerMenu({ open, onClose, onSettingsClick }: Props) {
  const { t } = useTranslation();

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const NAV_MAIN = [
    { icon: TrendingUp,  labelKey: "nav.trade",     href: BASE + "/trade" },
    { icon: BarChart2,   labelKey: "nav.markets",   href: BASE + "/markets" },
    { icon: Wallet,      labelKey: "nav.portfolio", href: BASE + "/trade" },
  ];

  const NAV_RESOURCES = [
    { icon: BookOpen,   labelKey: "menu.docs",    href: true },
    { icon: HelpCircle, labelKey: "menu.support", href: true },
  ];

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.65)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          backdropFilter: open ? "blur(4px)" : "none",
        }}
      />

      <div
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 280,
          backgroundColor: "var(--m-bg-1)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.5)" : "none",
          borderRight: "1px solid var(--m-bdr)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[58px] shrink-0">
          <div className="flex items-center gap-2">
            <img 
              src="https://ndgywsfyfxrixhkfrtia.supabase.co/storage/v1/object/public/My%20logod/IMG_8705.png" 
              alt="Unbound"
              style={{ width: 28, height: 28, objectFit: "contain" }}
            />
            <span className="font-bold text-[15px] tracking-widest" style={{ color: "var(--m-fg)" }}>
              UNBOUND
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wallet connect strip - REMOVED */}

        <div className="mx-4 mb-2 h-px rounded-full" style={{ backgroundColor: "var(--m-bdr)" }} />

        {/* Main nav */}
        <div className="px-3 py-2 shrink-0">
          <p className="text-[10px] font-bold tracking-widest uppercase px-2 mb-1.5" style={{ color: "var(--m-fg-5)" }}>
            {t('header.menu')}
          </p>
          {NAV_MAIN.map(({ icon: Icon, labelKey, href }) => (
            <a
              key={labelKey}
              href={href}
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 h-[44px] rounded-xl transition-all active:opacity-70"
              style={{ backgroundColor: "transparent", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--m-bg-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div className="flex items-center gap-3">
                <Icon style={{ width: 18, height: 18, color: "var(--m-fg-4)" }} />
                <span className="text-[14px] font-medium" style={{ color: "var(--m-fg-2)" }}>
                  {t(labelKey)}
                </span>
              </div>
              <ChevronRight style={{ width: 14, height: 14, color: "var(--m-fg-5)" }} />
            </a>
          ))}
        </div>

        <div className="mx-4 my-1 h-px rounded-full" style={{ backgroundColor: "var(--m-bdr)" }} />

        {/* Resources */}
        <div className="px-3 py-2 shrink-0">
          <p className="text-[10px] font-bold tracking-widest uppercase px-2 mb-1.5" style={{ color: "var(--m-fg-5)" }}>
            {t('menu.resources')}
          </p>
          {NAV_RESOURCES.map(({ icon: Icon, labelKey }) => (
            <button
              key={labelKey}
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 h-[44px] rounded-xl transition-all active:opacity-70"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--m-bg-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div className="flex items-center gap-3">
                <Icon style={{ width: 18, height: 18, color: "var(--m-fg-4)" }} />
                <span className="text-[14px] font-medium" style={{ color: "var(--m-fg-2)" }}>
                  {t(labelKey)}
                </span>
              </div>
              <ExternalLink style={{ width: 14, height: 14, color: "var(--m-fg-5)" }} />
            </button>
          ))}
        </div>

        <div className="mx-4 my-1 h-px rounded-full" style={{ backgroundColor: "var(--m-bdr)" }} />

        {/* Settings */}
        <div className="px-3 py-2 shrink-0">
          <button
            onClick={() => {
              onSettingsClick?.();  // ✅ Call settings callback
              onClose();            // ✅ Close hamburger menu
            }}
            className="w-full flex items-center justify-between px-3 h-[44px] rounded-xl transition-all active:opacity-70"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--m-bg-3)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div className="flex items-center gap-3">
              <Settings style={{ width: 18, height: 18, color: "var(--m-fg-4)" }} />
              <span className="text-[14px] font-medium" style={{ color: "var(--m-fg-2)" }}>{t('nav.settings')}</span>
            </div>
            <ChevronRight style={{ width: 14, height: 14, color: "var(--m-fg-5)" }} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Socials */}
        <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--m-bdr)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--m-fg-5)" }}>
            {t('menu.community')}
          </p>
          <div className="flex items-center gap-2.5">
            {SOCIALS.map(({ id, color, icon }) => (
              <button
                key={id}
                title={id}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ backgroundColor: "var(--m-bg-3)", color }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 shrink-0 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--m-bdr)" }}
        >
          <span className="text-[11px]" style={{ color: "var(--m-fg-5)" }}>v1.0.0</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
            <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{t('menu.allSystemsOk')}</span>
          </div>
        </div>
      </div>
    </>
  );
}
