import React, { useState, useEffect, useCallback } from 'react';
import type { Order } from '../../types';
import { getTypeLabel, getStatusLabel, formatAmount, formatPrice } from '../../utils/orderLabels';
import { cancelOrder, getOpenOrders, getHistoryOrders } from '../../services/orderbook';

interface OrdersPanelProps {
  pairId?: string;
  onCancel?: (orderId: string) => void;
}

export function OrdersPanel({ pairId, onCancel }: OrdersPanelProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'open') {
        const response = await getOpenOrders(pairId);
        setOrders(response.data);
      } else {
        const response = await getHistoryOrders(pairId);
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pairId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      onCancel?.(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Failed to cancel order:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
      case 'open':
        return 'text-blue-400';
      case 'partial':
        return 'text-yellow-400';
      case 'filled':
        return 'text-green-400';
      case 'cancelled':
      case 'expired':
        return 'text-red-400';
      case 'triggered':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeBadgeColor = (order: Order) => {
    if (order.isLadder) return 'bg-orange-500/20 text-orange-400';
    if (order.orderType === 'stop_loss') return 'bg-red-500/20 text-red-400';
    if (order.orderType === 'take_profit') return 'bg-green-500/20 text-green-400';
    if (order.isPostOnly || order.orderType === 'post_only') return 'bg-purple-500/20 text-purple-400';
    if (order.orderType === 'market') return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const renderOrder = (order: Order) => {
    const typeLabel = getTypeLabel(order);
    const statusLabel = getStatusLabel(order.status);
    const isCancellable = order.status === 'pending' || order.status === 'partial' || order.status === 'open';

    return (
      <div
        key={order.id}
        className="p-3 border-b border-(--border) hover:bg-(--surface-elevated) transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
              {order.side === 'buy' ? 'Buy' : 'Sell'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${getTypeBadgeColor(order)}`}>
              {typeLabel}
            </span>
            {order.isLadder && order.ladderParentId && (
              <span className="text-xs text-(--text-dim)">Child</span>
            )}
          </div>
          <span className={`text-xs ${getStatusColor(order.status)}`}>
            {statusLabel}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-(--text-dim) text-xs">Price</p>
            <p className="text-(--text-primary)">{formatPrice(order.price)}</p>
          </div>
          <div>
            <p className="text-(--text-dim) text-xs">Amount</p>
            <p className="text-(--text-primary)">{formatAmount(order.amount)}</p>
          </div>
          <div>
            <p className="text-(--text-dim) text-xs">Filled</p>
            <p className="text-(--text-primary)">{formatAmount(order.filledAmount)}</p>
          </div>
        </div>

        {order.triggerPrice && (
          <div className="mt-2 text-xs text-(--text-dim)">
            Trigger: {formatPrice(order.triggerPrice)}
          </div>
        )}

        {order.isLadder && order.ladderLevels && (
          <div className="mt-2 text-xs text-(--text-dim)">
            Ladder: {order.ladderLevels} levels ({formatPrice(order.ladderPriceStart || 0)} - {formatPrice(order.ladderPriceEnd || 0)})
          </div>
        )}

        {isCancellable && activeTab === 'open' && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => handleCancel(order.id)}
              disabled={cancellingId === order.id}
              className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {cancellingId === order.id ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
      <div className="flex border-b border-(--border)">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'open'
              ? 'text-(--text-primary) border-b-2 border-[#6366f1]'
              : 'text-(--text-dim) hover:text-(--text-primary)'
          }`}
        >
          Open Orders
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-(--text-primary) border-b-2 border-[#6366f1]'
              : 'text-(--text-dim) hover:text-(--text-primary)'
          }`}
        >
          History
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-(--text-dim)">
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center text-(--text-dim)">
          No {activeTab === 'open' ? 'open' : 'historical'} orders
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {orders.map(renderOrder)}
        </div>
      )}
    </div>
  );
}