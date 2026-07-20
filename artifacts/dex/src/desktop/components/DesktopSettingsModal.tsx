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
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-white">{label}</span>
        {sub && <span className="text-[11px] text-[#888]">{sub}</span>}
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
      style={{ backgroundColor: on ? "#f5c518" : "#2a2a2a" }}
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
    <p className="text-[10px] font-bold tracking-widest uppercase px-4 pt-4 pb-2 text-[#666]">
      {label}
    </p>
  );
}

function Divider() {
  return <div className="mx-4 h-px bg-[#1a1a1a]" />;
}

export function DesktopSettingsModal({ open, onClose }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const { showGas, showBlock, soundEnabled, setShowGas, setShowBlock, setSoundEnabled } = useSettings();
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl"
        style={{ width: 480, maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <span className="text-[16px] font-bold text-white">{t('settings.title')}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1a1a1a] text-[#888]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── Appearance ── */}
          <SectionLabel label={t('settings.appearance')} />
          <div className="mx-3 rounded-xl overflow-hidden bg-[#161616]">
            <Row
              label={t('settings.darkMode')}
              sub={isDark ? t('settings.darkMode.subDark') : t('settings.darkMode.subLight')}
            >
              <div className="flex items-center gap-2">
                {isDark
                  ? <Moon className="w-4 h-4 text-[#f5c518]" />
                  : <Sun  className="w-4 h-4 text-[#f5c518]" />
                }
                <Toggle on={isDark} onToggle={toggleTheme} />
              </div>
            </Row>
          </div>

          {/* ── Notifications ── */}
          <SectionLabel label="NOTIFICATIONS" />
          <div className="mx-3 rounded-xl overflow-hidden bg-[#161616]">
            <Row
              label="Fill Sound"
              sub="Play sound when your orders are filled"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" style={{ color: soundEnabled ? "#f5c518" : "#666" }} />
                <Toggle on={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
              </div>
            </Row>
            {soundEnabled && (
              <>
                <Divider />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] font-semibold text-white">Preview Sound</span>
                  <button
                    onClick={testFillSound}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#1a1a1a] text-[#f5c518]"
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
          <div className="mx-3 mb-4 rounded-xl overflow-hidden bg-[#161616]">
            <Row
              label={t('settings.liveGas')}
              sub={t('settings.liveGas.sub')}
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: showGas ? "#f97316" : "#666" }} />
                <Toggle on={showGas} onToggle={() => setShowGas(!showGas)} />
              </div>
            </Row>
            <Divider />
            <Row
              label={t('settings.liveBlock')}
              sub={t('settings.liveBlock.sub')}
            >
              <div className="flex items-center gap-2">
                <Blocks className="w-4 h-4" style={{ color: showBlock ? "#22c55e" : "#666" }} />
                <Toggle on={showBlock} onToggle={() => setShowBlock(!showBlock)} />
              </div>
            </Row>
          </div>

        </div>
      </div>
    </>
  );
}
