import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Sun, Moon, Menu, X, Globe, TrendingUp, FileText, Star, BookOpen } from 'lucide-react';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { useStore } from '../../stores/useStore';
import { useTranslation, LANGUAGE_OPTIONS } from '../../i18n/i18n';

interface MobileHeaderProps {
  minimal?: boolean;
}

export function MobileHeader({ minimal }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useStore();
  const { t } = useTranslation();

  const logoLightUrl = 'https://zhzihlfavquifmccvhqz.supabase.co/storage/v1/object/public/my%20logos/logo_transparent.png';
  const logoDarkUrl = 'https://zhzihlfavquifmccvhqz.supabase.co/storage/v1/object/public/my%20logos/IMG_7972.png';
  const logoUrl = theme === 'dark' ? logoDarkUrl : logoLightUrl;

  if (minimal) {
    return (
      <header className="sticky top-0 z-40 bg-(--background)/95 backdrop-blur-xl border-b border-(--border)">
        <div className="flex items-center justify-start h-14 px-4">
          <button
            onClick={() => navigate('/')}
            aria-label={t('header.aria.backHome')}
            className="p-2 -ml-2 text-(--text-secondary) hover:text-(--text-primary)"
          >
            <Home size={20} />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-(--background)/95 backdrop-blur-xl border-b border-(--border)">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-(--text-secondary) hover:text-(--text-primary)">
            <Home size={20} />
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <img
                src={logoUrl}
                alt="Unbound"
                className="w-7 h-7 object-cover"
              />
            </div>
            <span className="text-sm font-semibold tracking-tight text-(--text-primary)">Unbound</span>
          </button>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="dynamic-widget-container dynamic-widget-mobile min-w-0 max-w-[160px]" style={{ zIndex: 100 }}>
            <DynamicWidget />
          </div>
          <div className="relative z-20" style={{ zIndex: 102 }}>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

// Mobile hamburger menu
function MobileMenu() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useStore();
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: t('header.nav.trade'), path: '/trade', icon: TrendingUp },
    { label: t('header.nav.orders'), path: '/orders', icon: FileText },
    { label: t('header.nav.watchlist'), path: '/watchlist', icon: Star },
    { label: t('header.nav.docs'), path: '#', external: true, icon: BookOpen },
  ];

  const handleNavClick = (path: string, external?: boolean) => {
    if (external) {
      window.open('https://docs.example.com', '_blank');
    } else {
      navigate(path);
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-(--surface-elevated)/50 hover:bg-(--surface-elevated) text-(--text-primary) transition-colors border border-(--border)/30"
        aria-label={t('header.aria.menu')}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-(--surface) border border-(--border) rounded-xl shadow-xl z-[200] overflow-hidden">
          {/* Language selector section - moved to top */}
          <div className="py-3 px-4 border-b border-(--border)">
            <div className="flex items-center gap-2 text-xs font-semibold text-(--text-dim) uppercase mb-2">
              <Globe size={14} />
              {t('header.language')}
            </div>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value as typeof language);
                setIsOpen(false);
              }}
              className="w-full bg-(--surface-elevated) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40"
            >
              {LANGUAGE_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation items */}
          <div className="py-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.path, item.external)}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-(--text-primary) hover:bg-(--surface-elevated) transition-colors border-b border-(--border)/30 last:border-0 flex items-center gap-3"
                >
                  {Icon && <Icon size={18} className="text-(--text-secondary)" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-(--border)/30">
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-2xl border border-(--border) bg-(--surface-elevated) px-4 py-3 text-sm font-medium text-(--text-primary) hover:bg-(--surface-hover) transition-colors"
            >
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <span className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-[#6366f1]' : 'bg-[#cbd5e1]'}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-1'}`} />
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}