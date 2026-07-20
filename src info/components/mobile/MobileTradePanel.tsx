import React, { useState, useEffect } from 'react';
import type { Pair } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { tokenColor } from '../../utils/mockData';
import { formatInputNumber } from '../../utils/formatters';
import { useStore } from '../../stores/useStore';
import { useTranslation } from '../../i18n/i18n';

interface MobileTradePanelProps {
  pair: Pair | null;
}

type OrderSide = 'buy' | 'sell';

function TokenLogo({ src, alt, fallbackColor, size = 20 }: { src?: string; alt: string; fallbackColor: string; size?: number }) {
  const [hasError, setHasError] = useState(false);
  const hasLogo = Boolean(src) && !hasError;

  if (hasLogo) {
    return (
      <img
        src={src}
        alt={alt}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, backgroundColor: fallbackColor, fontSize: size * 0.36 }}
    >
      {alt.slice(0, 2)}
    </div>
  );
}

export function MobileTradePanel({ pair }: MobileTradePanelProps) {
  const [side, setSide] = useState<OrderSide>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useDynamicContext();
  const { t } = useTranslation();

  useEffect(() => {
    if (pair) {
      setPrice(formatInputNumber(pair.price));
    }
  }, [pair]);
  const storeConnected = useStore(s => s.isConnected);
  
const isConnected = !!(isAuthenticated || user?.verifiedCredentials?.length || storeConnected);
  
  const total = parseFloat(price || '0') * parseFloat(amount || '0');

  const handleSubmit = () => {
    if (!isConnected || !pair) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  if (!pair) {
    return (
      <div className="bg-(--surface) border border-(--border) rounded-xl p-6 m-4 flex items-center justify-center">
        <p className="text-(--text-dim)">{t('trade.selectPair')}</p>
      </div>
    );
  }

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden m-4">
      <div className="px-4 py-3 border-b border-(--border)">
        <div className="flex items-center gap-2">
          <TokenLogo src={pair.baseToken.logo} alt={pair.baseToken.symbol} fallbackColor={tokenColor(pair.baseToken.symbol)} size={18} />
          <TokenLogo src={pair.quoteToken.logo} alt={pair.quoteToken.symbol} fallbackColor={tokenColor(pair.quoteToken.symbol)} size={18} />
          <span className="font-semibold text-(--text-primary)">{pair.baseToken.symbol}</span>
          <span className="text-(--text-dim)">/</span>
          <span className="text-(--text-dim)">{pair.quoteToken.symbol}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 p-1 bg-(--surface-elevated) rounded-lg mb-4">
          <button
            onClick={() => setSide('buy')}
            className={`flex-1 py-3 rounded-md text-sm font-medium transition-colors ${
              side === 'buy' ? 'bg-[#10b981] text-white' : 'text-(--text-dim) hover:text-(--text-primary)'
            }`}
          >
            {t('trade.buy')}
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`flex-1 py-3 rounded-md text-sm font-medium transition-colors ${
              side === 'sell' ? 'bg-[#ef4444] text-white' : 'text-(--text-dim) hover:text-(--text-primary)'
            }`}
          >
            {t('trade.sell')}
          </button>
        </div>

        <div className="mb-3">
          <Input
            label={t('trade.price')}
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
          />
        </div>

        <div className="mb-3">
          <Input
            label={t('trade.amount')}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
          />
        </div>

        <div className="mb-4">
          <Input
            label={t('trade.total')}
            placeholder="0.00"
            value={total.toString()}
            disabled
          />
        </div>

        <div className="mb-4">
          <Input
            label={t('trade.receiverLabel')}
            placeholder={t('trade.receiverPlaceholder')}
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <p className="text-xs text-(--text-dim) mt-1">{t('trade.receiverHelp')}</p>
        </div>

        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!isConnected || !price || !amount}
          className={`w-full py-4 ${side === 'buy' ? 'bg-[#10b981] hover:bg-[#34d399]' : 'bg-[#ef4444] hover:bg-[#f87171]'}`}
        >
          {!isConnected ? t('trade.connectWallet') : (side === 'buy' ? t('trade.buy') : t('trade.sell'))} {pair.baseToken.symbol}
        </Button>
      </div>
    </div>
  );
}
