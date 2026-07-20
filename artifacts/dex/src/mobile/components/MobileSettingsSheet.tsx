import { useState } from "react";
import { X, Sun, Moon, Flame, Blocks, Volume2, Play } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "@/i18n/i18n";
import { testFillSound } from "@/utils/sound";

interface Props {
  open: boolean;
  onClose: () => void;
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold" style={{ color: "var(--m-fg)" }}>{label}</span>
        {sub && <span className="text-[11px]" style={{ color: "var(--m-fg-5)" }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0"
      style={{ backgroundColor: on ? "#f5c518" : "var(--m-bg-4)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase px-4 pt-4 pb-1" style={{ color: "var(--m-fg-5)" }}>
      {label}
    </p>
  );
}

function Divider() {
  return <div className="mx-4 h-px" style={{ backgroundColor: "var(--m-bdr)" }} />;
}

export function MobileSettingsSheet({ open, onClose }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const { showGas, showBlock, soundEnabled, setShowGas, setShowBlock, setSoundEnabled } = useSettings();
  const { t } = useTranslation();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: open ? "blur(3px)" : "none",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          backgroundColor: "var(--m-bg-1)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--m-bdr)",
          borderBottom: "none",
          maxHeight: "75vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Handle */}
        <div className="flex flex-col items-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--m-bg-4)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <span className="text-[16px] font-bold" style={{ color: "var(--m-fg)" }}>{t('settings.title')}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors active:scale-90"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Divider />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── Appearance ── */}
          <SectionLabel label={t('settings.appearance')} />
          <div className="mx-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-bg-2)" }}>
            <Row
              label={t('settings.darkMode')}
              sub={isDark ? t('settings.darkMode.subDark') : t('settings.darkMode.subLight')}
            >
              <div className="flex items-center gap-2">
                {isDark
                  ? <Moon className="w-4 h-4" style={{ color: "#f5c518" }} />
                  : <Sun  className="w-4 h-4" style={{ color: "#f5c518" }} />
                }
                <Toggle on={isDark} onToggle={toggleTheme} />
              </div>
            </Row>
          </div>

          {/* ── Notifications ── */}
          <SectionLabel label="NOTIFICATIONS" />
          <div className="mx-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-bg-2)" }}>
            <Row
              label="Fill Sound"
              sub="Play sound when your orders are filled"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" style={{ color: soundEnabled ? "#f5c518" : "var(--m-fg-5)" }} />
                <Toggle on={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
              </div>
            </Row>
            {soundEnabled && (
              <>
                <Divider />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--m-fg)" }}>Preview Sound</span>
                  <button
                    onClick={testFillSound}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                    style={{ backgroundColor: "var(--m-bg-3)", color: "#f5c518" }}
                  >
                    <Play className="w-3.5 h-3.5" fill="#f5c518" />
                    Test
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Chain Stats Display ── */}
          <SectionLabel label={t('settings.headerDisplay')} />
          <div className="mx-3 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-bg-2)" }}>
            <Row
              label={t('settings.liveGas')}
              sub={t('settings.liveGas.sub')}
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: showGas ? "#f97316" : "var(--m-fg-5)" }} />
                <Toggle on={showGas} onToggle={() => setShowGas(!showGas)} />
              </div>
            </Row>
            <Divider />
            <Row
              label={t('settings.liveBlock')}
              sub={t('settings.liveBlock.sub')}
            >
              <div className="flex items-center gap-2">
                <Blocks className="w-4 h-4" style={{ color: showBlock ? "#22c55e" : "var(--m-fg-5)" }} />
                <Toggle on={showBlock} onToggle={() => setShowBlock(!showBlock)} />
              </div>
            </Row>
          </div>

        </div>
      </div>
    </>
  );
}
