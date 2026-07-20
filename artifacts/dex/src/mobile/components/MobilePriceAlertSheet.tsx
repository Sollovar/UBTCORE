import { useState, useEffect, useRef } from "react";
import { X, Bell, BellOff, ArrowUp, ArrowDown, Trash2, CheckCircle } from "lucide-react";

export interface PriceAlert {
  id: string;
  symbol: string;
  base: string;
  direction: "above" | "below";
  target: number;
  color: string;
  initial: string;
  createdAt: number;
}

interface Props {
  symbol: string;
  base: string;
  currentPrice: number;
  color: string;
  initial: string;
  alerts: PriceAlert[];
  onAdd: (alert: PriceAlert) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

function fmtPrice(n: number) {
  if (n >= 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(4);
  return n.toFixed(6);
}

export function MobilePriceAlertSheet({
  symbol, base, currentPrice, color, initial, alerts, onAdd, onRemove, onClose,
}: Props) {
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [rawInput,  setRawInput]  = useState(() => fmtPrice(currentPrice * 1.05));
  const [saved,     setSaved]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRawInput(fmtPrice(direction === "above" ? currentPrice * 1.05 : currentPrice * 0.95));
  }, [direction, currentPrice]);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, []);

  function handleAdd() {
    const target = parseFloat(rawInput.replace(/,/g, ""));
    if (isNaN(target) || target <= 0) return;
    if (direction === "above" && target <= currentPrice) return;
    if (direction === "below" && target >= currentPrice) return;

    onAdd({
      id: Math.random().toString(36).slice(2),
      symbol, base, direction, target, color, initial,
      createdAt: Date.now(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    setRawInput(fmtPrice(direction === "above" ? currentPrice * 1.05 : currentPrice * 0.95));
  }

  const target  = parseFloat(rawInput.replace(/,/g, ""));
  const invalid = isNaN(target) || target <= 0
    || (direction === "above" && target <= currentPrice)
    || (direction === "below" && target >= currentPrice);

  const delta = !isNaN(target) && target > 0
    ? (((target - currentPrice) / currentPrice) * 100).toFixed(2)
    : null;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      />

      {/* sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col"
        style={{
          backgroundColor: "var(--m-bg)",
          border: "1px solid var(--m-bdr)",
          maxHeight: "85vh",
          animation: "slideUp 0.28s cubic-bezier(.32,1.2,.46,.99)",
        }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--m-bdr)" }} />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--m-bdr)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ backgroundColor: color + "25", border: `1.5px solid ${color}50` }}
            >
              <span style={{ color }}>{initial}</span>
            </div>
            <div>
              <p className="text-[15px] font-bold" style={{ color: "var(--m-fg)" }}>
                {base}<span style={{ color: "var(--m-fg-4)", fontWeight: 400 }}>/USDT</span>
              </p>
              <p className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>
                Current: <span className="font-semibold" style={{ color: "var(--m-fg)" }}>{fmtPrice(currentPrice)}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--m-bg-2)" }}>
            <X className="w-4 h-4" style={{ color: "var(--m-fg-4)" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* direction toggle */}
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--m-fg-5)" }}>Alert when price is</p>
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setDirection("above")}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-[13px] font-bold transition-all"
              style={{
                backgroundColor: direction === "above" ? "rgba(0,200,83,0.15)" : "var(--m-bg-2)",
                border: direction === "above" ? "1.5px solid #00c853" : "1.5px solid var(--m-bdr)",
                color: direction === "above" ? "#00c853" : "var(--m-fg-4)",
              }}
            >
              <ArrowUp className="w-4 h-4" />
              Above
            </button>
            <button
              onClick={() => setDirection("below")}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-[13px] font-bold transition-all"
              style={{
                backgroundColor: direction === "below" ? "rgba(255,77,106,0.15)" : "var(--m-bg-2)",
                border: direction === "below" ? "1.5px solid #ff4d6a" : "1.5px solid var(--m-bdr)",
                color: direction === "below" ? "#ff4d6a" : "var(--m-fg-4)",
              }}
            >
              <ArrowDown className="w-4 h-4" />
              Below
            </button>
          </div>

          {/* price input */}
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--m-fg-5)" }}>Target price (USDT)</p>
          <div
            className="flex items-center gap-3 h-[52px] px-4 rounded-2xl mb-1"
            style={{
              backgroundColor: "var(--m-bg-2)",
              border: `1.5px solid ${invalid && rawInput.length > 0 ? "#ff4d6a55" : "var(--m-bdr)"}`,
            }}
          >
            <span className="text-[13px] font-semibold" style={{ color: "var(--m-fg-4)" }}>$</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !invalid && handleAdd()}
              className="flex-1 bg-transparent outline-none text-[16px] font-semibold tabular-nums"
              style={{ color: "var(--m-fg)" }}
            />
          </div>

          {/* delta hint */}
          {delta !== null && (
            <p className="text-[11px] mb-5" style={{ color: "var(--m-fg-5)" }}>
              {parseFloat(delta) >= 0 ? "+" : ""}{delta}% from current price
            </p>
          )}
          {!delta && <div className="mb-5" />}

          {/* add button */}
          <button
            onClick={handleAdd}
            disabled={invalid}
            className="w-full h-[48px] rounded-2xl flex items-center justify-center gap-2 text-[14px] font-bold transition-all mb-6"
            style={{
              backgroundColor: saved ? "#00c853" : invalid ? "var(--m-bg-2)" : "#f5c518",
              color: saved ? "#fff" : invalid ? "var(--m-fg-5)" : "#000",
              opacity: invalid ? 0.6 : 1,
            }}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {saved ? "Alert set!" : "Set Alert"}
          </button>

          {/* existing alerts for this pair */}
          {alerts.length > 0 && (
            <>
              <div className="h-px mb-4" style={{ backgroundColor: "var(--m-bdr)" }} />
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--m-fg-5)" }}>
                Active alerts ({alerts.length})
              </p>
              <div className="flex flex-col gap-2">
                {alerts.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-4 h-[44px] rounded-2xl"
                    style={{ backgroundColor: "var(--m-bg-2)", border: "1px solid var(--m-bdr)" }}
                  >
                    <div className="flex items-center gap-2">
                      {a.direction === "above"
                        ? <ArrowUp className="w-3.5 h-3.5" style={{ color: "#00c853" }} />
                        : <ArrowDown className="w-3.5 h-3.5" style={{ color: "#ff4d6a" }} />
                      }
                      <span className="text-[13px] font-semibold" style={{ color: "var(--m-fg)" }}>
                        {a.direction === "above" ? "≥" : "≤"} ${fmtPrice(a.target)}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--m-fg-5)" }}>
                        ({a.direction})
                      </span>
                    </div>
                    <button
                      onClick={() => onRemove(a.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{ backgroundColor: "rgba(255,77,106,0.12)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#ff4d6a" }} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="h-4" />
            </>
          )}

          {alerts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-2">
              <BellOff className="w-5 h-5" style={{ color: "var(--m-fg-5)" }} />
              <p className="text-[12px]" style={{ color: "var(--m-fg-5)" }}>No active alerts for {base}/USDT</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.4; }
          to   { transform: translateY(0);    opacity: 1;   }
        }
      `}</style>
    </>
  );
}
