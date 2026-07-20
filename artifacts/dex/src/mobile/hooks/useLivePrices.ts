import { useState, useEffect, useRef } from "react";

export type FlashDir = "up" | "down" | null;

export interface LivePrice {
  price: number;
  flash: FlashDir;
}

type PriceMap  = Record<string, number>;
type FlashMap  = Record<string, FlashDir>;

const FLASH_DURATION = 650; // ms price stays coloured before fading back
const TICK_INTERVAL  = 1200; // ms between price ticks
const PAIRS_PER_TICK = 3;   // how many pairs update each tick

export function useLivePrices(initialPrices: PriceMap): Record<string, LivePrice> {
  const [prices, setPrices] = useState<PriceMap>(initialPrices);
  const [flashes, setFlashes] = useState<FlashMap>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const symbols = Object.keys(initialPrices);

    const tick = setInterval(() => {
      // pick a random subset of symbols to update this tick
      const shuffled = [...symbols].sort(() => Math.random() - 0.5);
      const chosen   = shuffled.slice(0, PAIRS_PER_TICK);

      const priceUpdates: PriceMap = {};
      const flashUpdates: FlashMap = {};

      chosen.forEach(sym => {
        const cur = prices[sym] ?? initialPrices[sym];
        // random tick: ±0.008% to ±0.04% of current price
        const pct = (Math.random() * 0.032 + 0.008) / 100;
        const up  = Math.random() > 0.5;
        const next = cur * (1 + (up ? pct : -pct));
        priceUpdates[sym] = next;
        flashUpdates[sym] = up ? "up" : "down";

        // clear any existing timer for this symbol
        if (flashTimers.current[sym]) clearTimeout(flashTimers.current[sym]);
        // schedule flash reset
        flashTimers.current[sym] = setTimeout(() => {
          setFlashes(prev => ({ ...prev, [sym]: null }));
        }, FLASH_DURATION);
      });

      setPrices(prev => ({ ...prev, ...priceUpdates }));
      setFlashes(prev => ({ ...prev, ...flashUpdates }));
    }, TICK_INTERVAL);

    return () => {
      clearInterval(tick);
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // merge into one map
  const combined: Record<string, LivePrice> = {};
  for (const sym of Object.keys(initialPrices)) {
    combined[sym] = { price: prices[sym] ?? initialPrices[sym], flash: flashes[sym] ?? null };
  }
  return combined;
}
