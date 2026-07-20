/**
 * Utility for optimistic orderbook updates
 * Allows immediate UI feedback when orders are created
 */

export interface OptimisticOrderParams {
  pairId: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
}

/**
 * Calculate the total value of an order
 */
export function calculateOrderTotal(price: number, amount: number): number {
  return price * amount;
}

/**
 * Validate order parameters
 */
export function validateOrderParams(params: OptimisticOrderParams): boolean {
  return (
    params.pairId &&
    (params.side === 'buy' || params.side === 'sell') &&
    params.price > 0 &&
    params.amount > 0
  );
}

/**
 * Get orderbook level info for display
 */
export function getOrderbookLevelInfo(
  side: 'buy' | 'sell',
  price: number,
  amount: number
) {
  return {
    price,
    amount,
    total: calculateOrderTotal(price, amount),
    side,
  };
}
