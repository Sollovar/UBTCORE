/**
 * useGeckoPriceFlash
 * ──────────────────
 * Tracks Gecko price changes (from CoinGecko/GeckoTerminal) and provides
 * real-time flash directions (up/down/null) for color animations.
 *
 * This is separate from exchange price flashes to properly show green/red
 * when Gecko prices update from the cache refresh / ticker events.
 *
 * Usage:
 *   const geckoFlash = useGeckoPriceFlash(pair?.id, pair?.geckoPrice);
 *   <span style={{ color: geckoFlash === 'up' ? '#00ff7f' : geckoFlash === 'down' ? '#ff4d6a' : baseColor }}>
 */

import { useEffect, useRef, useState } from 'react';

export type FlashDir = 'up' | 'down' | null;

const FLASH_DURATION = 700; // ms

export function useGeckoPriceFlash(pairId: string | undefined, geckoPrice: number | undefined): FlashDir {
  const [flash, setFlash] = useState<FlashDir>(null);
  const prevPrice = useRef<number | undefined>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset state when pair changes
    if (!pairId) {
      prevPrice.current = undefined;
      setFlash(null);
      return;
    }

    // Skip invalid prices
    if (geckoPrice == null || geckoPrice <= 0 || Number.isNaN(geckoPrice)) {
      return;
    }

    // First time seeing this price - store it but don't flash
    if (prevPrice.current === undefined || prevPrice.current === 0) {
      prevPrice.current = geckoPrice;
      return;
    }

    // Price changed - trigger flash
    // Use small epsilon to avoid floating point comparison issues
    const epsilon = 0.0000001;
    const priceDiff = Math.abs(geckoPrice - prevPrice.current);
    
    if (priceDiff > epsilon) {
      const direction: FlashDir = geckoPrice > prevPrice.current ? 'up' : 'down';
      setFlash(direction);

      // Clear any existing timer
      if (flashTimer.current) {
        clearTimeout(flashTimer.current);
      }

      // Reset flash after duration
      flashTimer.current = setTimeout(() => {
        setFlash(null);
      }, FLASH_DURATION);

      prevPrice.current = geckoPrice;
    }
  }, [pairId, geckoPrice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flashTimer.current) {
        clearTimeout(flashTimer.current);
      }
    };
  }, []);

  return flash;
}
