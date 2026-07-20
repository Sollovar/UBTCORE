import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/i18n/i18n";

export type NavTab = "Home" | "Markets" | "Trade" | "Portfolio" | "Account";

const HomeIcon = ({ active, inactiveColor }: { active: boolean; inactiveColor: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H13v-4H7v4H4a1 1 0 01-1-1V9.5z"
      stroke={active ? "#f5c518" : inactiveColor}
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill={active ? "rgba(245,197,24,0.15)" : "none"}
    />
  </svg>
);

const MarketsIcon = ({ active, inactiveColor }: { active: boolean; inactiveColor: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="13" width="3" height="5" rx="1" fill={active ? "#f5c518" : inactiveColor}/>
    <rect x="7" y="9" width="3" height="9" rx="1" fill={active ? "#f5c518" : inactiveColor}/>
    <rect x="12" y="5" width="3" height="13" rx="1" fill={active ? "#f5c518" : inactiveColor}/>
    <circle cx="16" cy="4" r="1.5" fill={active ? "#f5c518" : inactiveColor}/>
  </svg>
);

const TradeIcon = ({ active, inactiveColor }: { active: boolean; inactiveColor: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7" stroke={active ? "#f5c518" : inactiveColor} strokeWidth="1.5"/>
    <circle cx="10" cy="10" r="2.5" fill={active ? "#f5c518" : inactiveColor}/>
    <circle cx="10" cy="10" r="5" stroke={active ? "#f5c518" : inactiveColor} strokeWidth="0.8"/>
  </svg>
);

const PortfolioIcon = ({ active, inactiveColor }: { active: boolean; inactiveColor: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="6" width="16" height="11" rx="2"
      stroke={active ? "#f5c518" : inactiveColor} strokeWidth="1.5"
      fill={active ? "rgba(245,197,24,0.12)" : "none"}
    />
    <path d="M6 6V5a2 2 0 012-2h4a2 2 0 012 2v1"
      stroke={active ? "#f5c518" : inactiveColor} strokeWidth="1.5" strokeLinecap="round"
    />
    <path d="M2 10h16" stroke={active ? "#f5c518" : inactiveColor} strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="10" cy="10" r="1.5" fill={active ? "#f5c518" : inactiveColor}/>
  </svg>
);

const AccountIcon = ({ active, inactiveColor }: { active: boolean; inactiveColor: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="7" r="3" stroke={active ? "#f5c518" : inactiveColor} strokeWidth="1.5"/>
    <path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={active ? "#f5c518" : inactiveColor} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

interface Props {
  activeNav: NavTab;
  accountActive?: boolean;
  onNavChange: (tab: NavTab) => void;
}

export function MobileBottomNav({ activeNav, accountActive = false, onNavChange }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const inactiveColor = isDark ? "#555555" : "#aaaaaa";
  const tabs: NavTab[] = ["Home", "Markets", "Trade", "Portfolio", "Account"];

  const tabLabel: Record<NavTab, string> = {
    Home:      t('nav.home'),
    Markets:   t('nav.markets'),
    Trade:     t('nav.trade'),
    Portfolio: t('nav.portfolio'),
    Account:   t('nav.account'),
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-[60px] flex items-center justify-around z-50"
      style={{
        backgroundColor: "var(--m-bg-1)",
        borderTop: "1px solid var(--m-bdr)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const active = tab === "Account" ? accountActive : activeNav === tab;
        return (
          <button
            key={tab}
            onClick={() => onNavChange(tab)}
            className="flex flex-col items-center gap-1 flex-1 h-full justify-center transition-opacity active:opacity-60"
          >
            <div
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{ backgroundColor: active ? "rgba(245,197,24,0.1)" : "transparent" }}
            >
              {tab === "Home"      && <HomeIcon      active={active} inactiveColor={inactiveColor} />}
              {tab === "Markets"   && <MarketsIcon   active={active} inactiveColor={inactiveColor} />}
              {tab === "Trade"     && <TradeIcon     active={active} inactiveColor={inactiveColor} />}
              {tab === "Portfolio" && <PortfolioIcon active={active} inactiveColor={inactiveColor} />}
              {tab === "Account"   && <AccountIcon   active={active} inactiveColor={inactiveColor} />}
              <span
                className="text-[9px] font-semibold"
                style={{ color: active ? "#f5c518" : "var(--m-fg-4)" }}
              >
                {tabLabel[tab]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
