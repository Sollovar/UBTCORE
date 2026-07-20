import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface Settings {
  showGas:   boolean;
  showBlock: boolean;
  soundEnabled: boolean;
}

interface SettingsCtx extends Settings {
  setShowGas:   (v: boolean) => void;
  setShowBlock: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
}

const STORAGE_KEY = "UNBOUND_ui_settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { showGas: true, showBlock: true, soundEnabled: true, ...JSON.parse(raw) };
  } catch {}
  return { showGas: true, showBlock: true, soundEnabled: true };
}

function save(s: Settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  const set = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  };

  return (
    <Ctx.Provider
      value={{
        ...settings,
        setShowGas:   (v) => set({ showGas: v }),
        setShowBlock: (v) => set({ showBlock: v }),
        setSoundEnabled: (v) => set({ soundEnabled: v }),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
