import { Check, Globe, X } from "lucide-react";
import { useTranslation, type LanguageCode, LANGUAGE_OPTIONS } from "@/i18n/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DesktopLanguageModal({ open, onClose }: Props) {
  const { t, language, setLanguage } = useTranslation();

  if (!open) return null;

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "#0d0d0d",
          borderColor: "#1a1a1a",
          width: 480,
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            backgroundColor: "#0d0d0d",
            borderBottom: "1px solid #1a1a1a",
          }}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {t('header.language')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Grid */}
        <div className="overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGE_OPTIONS.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: isActive ? "rgba(245,197,24,0.10)" : "#161616",
                    border: isActive
                      ? "1px solid rgba(245,197,24,0.35)"
                      : "1px solid #1a1a1a",
                  }}
                >
                  {/* Language Code Badge */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(245,197,24,0.18)"
                        : "#0d0d0d",
                      color: isActive ? "#f5c518" : "#666",
                    }}
                  >
                    {lang.code.toUpperCase()}
                  </div>

                  {/* Language Names */}
                  <div className="flex flex-col leading-none gap-1 min-w-0 flex-1">
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: isActive ? "#f5c518" : "#fff" }}
                    >
                      {lang.native}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {lang.name}
                    </span>
                  </div>

                  {/* Check Icon */}
                  {isActive && (
                    <Check className="w-4 h-4 ml-auto shrink-0 text-[#f5c518]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 shrink-0"
          style={{
            backgroundColor: "#0d0d0d",
            borderTop: "1px solid #1a1a1a",
          }}
        >
          <button
            onClick={onClose}
            className="w-full h-9 rounded-lg text-xs font-semibold transition-all hover:bg-white/10 active:scale-[0.98]"
            style={{
              backgroundColor: "#161616",
              color: "#999",
            }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </>
  );
}
