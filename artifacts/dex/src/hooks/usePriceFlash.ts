/**
 * usePriceFlash
 * ─────────────
 * Tracks backend exchange price changes (from market.price) and provides
 * real-time flash directions (up/down/null) for color animations.
 *
 * This is used for the order book mid price to flash based on actual
 * exchange price updates, not Gecko Terminal prices.
 *
 * Usage:
 *   const priceFlash = usePriceFlash(pairId, market.price);
 *   <span style={{ color: priceFlash === 'up' ? '#00ff7f' : priceFlash === 'down' ? '#ff4d6a' : baseColor }}>
 */

import { useEffect, useRef, useState } from 'react';

export type FlashDir = 'up' | 'down' | null;

const FLASH_DURATION = 700; // ms

export function usePriceFlash(pairId: string | undefined | null, exchangePrice: number | undefined): FlashDir {
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
    if (exchangePrice == null || exchangePrice <= 0 || Number.isNaN(exchangePrice)) {
      return;
    }

    // First time seeing this price - store it but don't flash
    if (prevPrice.current === undefined || prevPrice.current === 0) {
      prevPrice.current = exchangePrice;
      return;
    }

    // Price changed - trigger flash
    // Use small epsilon to avoid floating point comparison issues
    const epsilon = 0.0000001;
    const priceDiff = Math.abs(exchangePrice - prevPrice.current);
    
    if (priceDiff > epsilon) {
      const direction: FlashDir = exchangePrice > prevPrice.current ? 'up' : 'down';
      setFlash(direction);

      // Clear any existing timer
      if (flashTimer.current) {
        clearTimeout(flashTimer.current);
      }

      // Reset flash after duration
      flashTimer.current = setTimeout(() => {
        setFlash(null);
      }, FLASH_DURATION);

      prevPrice.current = exchangePrice;
    }
  }, [pairId, exchangePrice]);

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
