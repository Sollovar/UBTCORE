import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, LogIn } from 'lucide-react';
import type { OrderWithPair } from '../../types';
import { getStatusLabel, formatPrice } from '../../utils/orderLabels';
import { cancelOrder, getOpenOrders, getHistoryOrders } from '../../services/orderbook';
import { useStore } from '../../stores/useStore';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useConnectedNetwork } from '../../hooks/useConnectedNetwork';
import { useTranslation } from '../../i18n/i18n';

export function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [orders, setOrders] = useState<OrderWithPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { walletAddress: storeWalletAddress } = useStore();
  const { primaryWallet, user } = useDynamicContext();
  const connectedNetwork = useConnectedNetwork();

  const walletAddress = primaryWallet?.address || storeWalletAddress || user?.verifiedCredentials?.[0]?.address;
  const isConnected = !!walletAddress;
  const { t } = useTranslation();

  const fetchOrders = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'open') {
        const response = await getOpenOrders(walletAddress, connectedNetwork);
        setOrders(response.data);
      } else {
        const response = await getHistoryOrders(walletAddress, 50, 0, connectedNetwork);
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, walletAddress, connectedNetwork]);

  const prevWalletRef = useRef<string | null>(null);
  const prevTabRef = useRef<string>('open');
  const prevNetworkRef = useRef<string>('bsc');
  useEffect(() => {
    if (prevWalletRef.current !== walletAddress || prevTabRef.current !== activeTab || prevNetworkRef.current !== connectedNetwork) {
      prevWalletRef.current = walletAddress;
      prevTabRef.current = activeTab;
      prevNetworkRef.current = connectedNetwork;
      fetchOrders();
    }
  }, [walletAddress, activeTab, connectedNetwork, fetchOrders]);

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId.toString(), walletAddress || undefined);
      setOrders(prev => prev.filter(o => o.order.id !== orderId));
    } catch (error) {
      console.error('Failed to cancel order:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const getPairDisplay = (order: OrderWithPair) => {
    if (order.pair) {
      return {
        symbol: `${order.pair.base_symbol}/${order.pair.quote_symbol}`,
        baseLogo: order.pair.base_logo,
        quoteLogo: order.pair.quote_logo,
      };
    }
    return {
      symbol: order.order.pair_id,
      baseLogo: undefined,
      quoteLogo: undefined,
    };
  };

  const getStatusColor = (status: string) => {
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

  const getTypeBadgeColor = (order: OrderWithPair) => {
    if (order.order.is_ladder) return 'bg-orange-500/20 text-orange-400';
    if (order.order.order_type === 'stop_loss') return 'bg-red-500/20 text-red-400';
    if (order.order.order_type === 'take_profit') return 'bg-green-500/20 text-green-400';
    if (order.order.is_post_only || order.order.order_type === 'post_only') return 'bg-purple-500/20 text-purple-400';
    if (order.order.order_type === 'market') return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const getOrderTypeLabel = (order: OrderWithPair) => {
    const o = order.order;
    if (o.is_ladder) return t('orders.type.ladder');
    if (o.order_type === 'stop_loss') return t('orders.type.stopLoss');
    if (o.order_type === 'take_profit') return t('orders.type.takeProfit');
    if (o.is_post_only || o.order_type === 'post_only') return t('orders.type.postOnly');
    if (o.order_type === 'market') return t('orders.type.market');
    return t('orders.type.limit');
  };

  const renderOrder = (orderWithPair: OrderWithPair) => {
    const order = orderWithPair.order;
    const pair = getPairDisplay(orderWithPair);
    const statusLabel = getStatusLabel(order.status);
    const isCancellable = order.status === 'pending' || order.status === 'partial' || order.status === 'open';
    const typeLabel = getOrderTypeLabel(orderWithPair);

    return (
      <div
        key={order.id}
        className="mx-4 mb-3 bg-(--surface) border border-(--border) rounded-xl p-4 hover:bg-(--surface-elevated) transition-all duration-200 shadow-sm"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${order.side === 'buy' ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={`font-semibold text-sm ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
              {order.side === 'buy' ? t('orders.side.buy') : t('orders.side.sell')}
            </span>
            {/* Pair with logos */}
            <div className="flex items-center gap-1.5 ml-2">
              {pair.baseLogo && (
                <img src={pair.baseLogo} alt="" className="w-4 h-4 rounded-full" />
              )}
              <span className="text-(--text-primary) font-medium text-sm">{pair.symbol}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeColor(orderWithPair)} font-medium`}>
              {typeLabel}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(order.status)} bg-current/10`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div className="bg-(--background) rounded-lg p-2">
            <p className="text-(--text-dim) text-xs uppercase tracking-wide">{t('orders.detail.price')}</p>
            <p className="text-(--text-primary) font-semibold">${formatPrice(order.price)}</p>
          </div>
          <div className="bg-(--background) rounded-lg p-2">
            <p className="text-(--text-dim) text-xs uppercase tracking-wide">{order.side === 'buy' ? t('orders.detail.total') : t('orders.detail.amount')}</p>
            <p className="text-(--text-primary) font-semibold">{orderWithPair.amount_in_human} {orderWithPair.token_in_info?.symbol || order.token_in}</p>
          </div>
          <div className="bg-(--background) rounded-lg p-2">
            <p className="text-(--text-dim) text-xs uppercase tracking-wide">{t('orders.detail.receive')}</p>
            <p className="text-(--text-primary) font-semibold">{orderWithPair.amount_out_min_human} {orderWithPair.token_out_info?.symbol || order.token_out}</p>
          </div>
          <div className="bg-(--background) rounded-lg p-2">
            <p className="text-(--text-dim) text-xs uppercase tracking-wide">{t('orders.detail.expires')}</p>
            <p className="text-(--text-primary) font-semibold text-xs">
              {order.expiration ? new Date(order.expiration).toLocaleDateString() : t('orders.detail.never')}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        {(order.trigger_price && parseFloat(order.trigger_price) > 0) && (
          <div className="mb-2 text-xs text-(--text-dim) bg-(--background) rounded-lg p-2">
            <span className="font-medium">{t('orders.detail.trigger')}:</span> ${formatPrice(order.trigger_price)}
          </div>
        )}

        {order.is_ladder && order.ladder_levels && (
          <div className="mb-2 text-xs text-(--text-dim) bg-(--background) rounded-lg p-2">
            <span className="font-medium">{t('orders.detail.ladder')}:</span> {order.ladder_levels} levels (${formatPrice(order.ladder_price_start || '0')} - ${formatPrice(order.ladder_price_end || '0')})
          </div>
        )}

        {order.is_ladder && order.ladder_parent_id && (
          <div className="mb-2 text-xs text-orange-400 bg-orange-500/10 rounded-lg p-2 font-medium">
            {t('orders.detail.ladderChild')}
          </div>
        )}

        {/* Cancel Button */}
        {isCancellable && activeTab === 'open' && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => handleCancel(order.id)}
              disabled={cancellingId === order.id}
              className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50 border border-red-500/20"
            >
              {cancellingId === order.id ? t('orders.canceling') : t('orders.cancel')}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 bg-(--background) overflow-hidden">
      {/* Header */}
      <div className="bg-(--surface) border-b border-(--border) px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/trade')}
            className="p-2 rounded-lg hover:bg-(--surface-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors"
            aria-label="Back to trade"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <FileText size={24} className="text-(--primary)" />
            <h1 className="text-xl font-bold text-(--text-primary)">{t('orders.title')}</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-(--surface) border-b border-(--border)">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'open'
              ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/5'
              : 'text-(--text-dim) hover:text-(--text-primary) hover:bg-(--surface-elevated)'
          }`}
        >
          {t('orders.tab.open')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'history'
              ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/5'
              : 'text-(--text-dim) hover:text-(--text-primary) hover:bg-(--surface-elevated)'
          }`}
        >
          {t('orders.tab.history')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-(--background)">
        {!isConnected ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-(--surface) rounded-full flex items-center justify-center">
              <LogIn size={32} className="text-(--text-dim)" />
            </div>
            <h3 className="text-lg font-semibold text-(--text-primary) mb-2">{t('orders.connectWallet')}</h3>
            <p className="text-sm text-(--text-dim) max-w-sm mx-auto">{t('orders.connectWalletDescription')}</p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-(--primary) border-t-transparent rounded-full animate-spin" />
            <p className="text-(--text-primary)">{t('orders.loading')}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-(--surface) rounded-full flex items-center justify-center">
              <FileText size={32} className="text-(--text-dim)" />
            </div>
            <h3 className="text-lg font-semibold text-(--text-primary) mb-2">
              {activeTab === 'open' ? t('orders.emptyTitle.open') : t('orders.emptyTitle.history')}
            </h3>
            <p className="text-sm text-(--text-dim)">{activeTab === 'open' ? t('orders.emptyDescription.open') : t('orders.emptyDescription.history')}</p>
          </div>
        ) : (
          <div className="py-4">
            {orders.map(renderOrder)}
          </div>
        )}
      </div>
    </div>
  );
}