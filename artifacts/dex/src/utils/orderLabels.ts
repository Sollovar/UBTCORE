import type { Order, OrderSide, OrderType, OrderStatus } from '../types';

export function getOrderLabel(order: Order): string {
  const side = order.side === 'buy' ? 'Buy' : 'Sell';
  return side;
}

export function getTypeLabel(order: Order): string {
  if (order.isLadder) {
    return 'Ladder';
  }

  if (order.orderType === 'stop_loss') {
    return 'Stop Loss';
  }

  if (order.orderType === 'take_profit') {
    return 'Take Profit';
  }

  if (order.isPostOnly || order.orderType === 'post_only') {
    return 'Post Only';
  }

  if (order.orderType === 'market') {
    return 'Market';
  }

  return 'Limit';
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Open';
    case 'partial':
      return 'Partially Filled';
    case 'filled':
      return 'Filled';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    case 'triggered':
      return 'Triggered';
    case 'open':
      return 'Open';
    default:
      return status;
  }
}

export function formatAmount(amount: number | string, decimals: number = 4): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(decimals);
}

export function formatPrice(price: number | string, decimals: number = 4): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0';
  if (num >= 1000) {
    return num.toFixed(2);
  }
  if (num < 0.0001) {
    return num.toFixed(8);
  }
  return num.toFixed(decimals);
}