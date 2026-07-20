import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown, Clock, ExternalLink, Copy } from 'lucide-react';
import type { Pair, OrderbookLevel, Orderbook, RecentTrade } from '../../types';
import { CandlestickChart } from '../common/CandlestickChart';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { tokenColor, getCachedCandles } from '../../utils/mockData';
import { formatPrice, formatPercent, formatNumber, formatSpreadPercent, formatUSD, calculateQuoteTokenUSDValue, formatInputNumber } from '../../utils/formatters';
import { fromWei, getTokenDecimals, fetchTokenDecimals } from '../../utils/amount';
import { useStore } from '../../stores/useStore';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useOrderbook } from '../../hooks/useOrderbook';
import { usePairWebsocket } from '../../hooks/usePairWebsocket';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useOrderCreation } from '../../hooks/useOrderCreation';
import { useFillNotifications } from '../../hooks/useFillNotifications';
import { useSolanaDeposit } from '../../hooks/useSolanaDeposit';
import { useBalances } from '../../hooks/useTokenBalance';
import { useUSDValues } from '../../hooks/useTokenUSDPrice';
import { useToast } from '../common/Toast';
import { useTranslation } from '../../i18n/i18n';
import { getTrades } from '../../services/orderbook';
import { getExplorerUrl } from '../../utils/constants';
import { getSolanaDepositMemo } from '../../utils/contracts';

// ─── Token Avatar ─────────────────────────────────────────────────
function TokenAvatar({ symbol, logo, size = 30 }: { symbol: string; logo?: string; size?: number }) {
  const [hasError, setHasError] = useState(false);
  const color = tokenColor(symbol);
  const hasLogo = Boolean(logo) && !hasError;

  if (hasLogo) {
    return (
      <img
        src={logo}
        alt={symbol}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size, border: `1.5px solid ${color}44` }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}cc, ${color}66)`, border: `1.5px solid ${color}44`, fontSize: size * 0.36 }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

// ─── Pair Ticker Header ───────────────────────────────────────────
function PairTickerBar({ pair }: { pair: Pair }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPos = pair.priceChange24h >= 0;
  const candles = getCachedCandles(pair.id, pair.price);
  const last = candles[candles.length - 1];
  const high24h = pair.high24h || parseFloat(pair.priceHigh24h ?? '0') || 0;
  const low24h = pair.low24h || parseFloat(pair.priceLow24h ?? '0') || 0;
  const derivedVolume24hUSD = pair.volume24hUSD != null
    ? pair.volume24hUSD
    : calculateQuoteTokenUSDValue(pair.volume24h, pair.price, pair.priceUSD);
  const derivedLiquidityUSD = pair.liquidityUSD != null
    ? pair.liquidityUSD
    : pair.liquidity * pair.priceUSD;

  useEffect(() => {
    console.debug('[DesktopTradingpage] PairTickerBar derived USD', {
      pairId: pair.id,
      price: pair.price,
      priceUSD: pair.priceUSD,
      volume24h: pair.volume24h,
      volume24hUSD: pair.volume24hUSD,
      derivedVolume24hUSD,
      liquidity: pair.liquidity,
      liquidityUSD: pair.liquidityUSD,
      derivedLiquidityUSD,
    });
  }, [pair.id, pair.price, pair.priceUSD, pair.volume24h, pair.volume24hUSD, derivedVolume24hUSD, pair.liquidity, pair.liquidityUSD, derivedLiquidityUSD]);

  return (
    <div className="bg-(--surface) border-b border-(--border) px-4 py-3">
      <div className="max-w-full flex items-center gap-6 overflow-x-auto scrollbar-hide">
        {/* Back + pair name */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/trade')}
            className="p-1.5 rounded-lg hover:bg-(--surface-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors"
            aria-label="Back to markets"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex -space-x-2">
            <TokenAvatar symbol={pair.baseToken.symbol} logo={pair.baseToken.logo} size={30} />
            <TokenAvatar symbol={pair.quoteToken.symbol} logo={pair.quoteToken.logo} size={22} />
          </div>
          <div>
            <h2 className="font-bold text-(--text-primary) text-base leading-none">
              {pair.baseToken.symbol}
              <span className="text-(--text-dim) font-normal">/{pair.quoteToken.symbol}</span>
            </h2>
            <span className="text-[11px] text-(--text-dim)">{pair.dexName}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex-shrink-0">
          <div className="flex flex-col">
            <p className={`text-lg font-medium leading-none ${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {formatPrice(pair.price)}
            </p>
            {pair.priceUSD != null && (
              <span className="text-xs text-(--text-dim)">
                {formatUSD(pair.priceUSD)}
              </span>
            )}
          </div>
          <span className={`flex items-center gap-0.5 text-sm font-medium mt-0.5 ${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {isPos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {formatPercent(pair.priceChange24h)}
          </span>
        </div>

        {/* Stats */}
        {[
          { label: t('trade.high24h'), value: formatPrice(pair.priceHigh24h ?? high24h), usdValue: pair.priceUSD && pair.priceHigh24h ? formatUSD(pair.priceUSD * (pair.priceHigh24h / pair.price)) : undefined, cls: 'text-[#10b981]' },
          { label: t('trade.low24h'), value: formatPrice(pair.priceLow24h ?? low24h), usdValue: pair.priceUSD && pair.priceLow24h ? formatUSD(pair.priceUSD * (pair.priceLow24h / pair.price)) : undefined, cls: 'text-[#ef4444]' },
          { label: t('trade.volume24h'), value: formatNumber(pair.volume24h), usdValue: derivedVolume24hUSD != null ? formatUSD(derivedVolume24hUSD) : undefined, cls: 'text-(--text-primary)' },
          { label: t('trade.liquidity'), value: formatNumber(pair.liquidity), usdValue: derivedLiquidityUSD != null ? formatUSD(derivedLiquidityUSD) : undefined, cls: 'text-(--text-primary)' },
        ].map(({ label, value, usdValue, cls }) => (
          <div key={label} className="flex-shrink-0">
            <p className="text-[11px] text-(--text-dim) leading-none mb-1">{label}</p>
            <p className={`text-sm font-medium ${cls}`}>{value}</p>
            {usdValue != null && <p className="text-xs text-(--text-dim)">{usdValue}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Orderbook ────────────────────────────────────────────────────
function OrderbookPanel({ orderbook, trades, pair }: { orderbook: Orderbook; trades?: RecentTrade[]; pair: Pair }) {
  const { t } = useTranslation();
  const { copyToClipboard } = useCopyToClipboard();
  const [activeView, setActiveView] = useState<'book' | 'trades' | 'info'>('book');
  const { pairs } = useStore();

  // Get the pair info for decimals
  const currentPair = pairs.find(p => p.id === pair.id) || pair;
  const baseDecimals = getTokenDecimals(currentPair.baseToken);
  const quoteDecimals = getTokenDecimals(currentPair.quoteToken);
  const [tradeBaseDecimals, setTradeBaseDecimals] = useState<number>(baseDecimals);

  useEffect(() => {
    const tokenAddress = currentPair.baseToken?.address || pair.baseToken?.address;
    const network = pair.network || currentPair.network;
    if (!tokenAddress || !network) return;

    let canceled = false;
    console.debug('[DesktopTrades] fetching base token decimals', tokenAddress, network);

    fetchTokenDecimals(tokenAddress, network as 'bsc' | 'base' | 'solana')
      .then((decimals) => {
        if (!canceled) {
          console.debug('[DesktopTrades] resolved base token decimals', tokenAddress, decimals);
          setTradeBaseDecimals(decimals);
        }
      })
      .catch((error) => {
        console.error('[DesktopTrades] error fetching base token decimals', tokenAddress, network, error);
      });

    return () => { canceled = true; };
  }, [currentPair.baseToken?.address, currentPair.network, pair.baseToken?.address, pair.network]);

  // Handle empty or null orderbook gracefully
  const asks = orderbook?.asks || [];
  const bids = orderbook?.bids || [];

  const maxAskTotal = asks.length > 0 ? Math.max(...asks.map(a => typeof a.total === 'string' ? parseFloat(a.total) : a.total), 1) : 1;
  const maxBidTotal = bids.length > 0 ? Math.max(...bids.map(b => typeof b.total === 'string' ? parseFloat(b.total) : b.total), 1) : 1;
  const maxTotal = Math.max(maxAskTotal, maxBidTotal);

  function LevelRow({ level, type }: { level: OrderbookLevel; type: 'ask' | 'bid' }) {
    // Backend already converts from wei, so use values directly
    const amount = typeof level.amount === 'string' ? parseFloat(level.amount) : level.amount;
    const total = typeof level.total === 'string' ? parseFloat(level.total) : level.total;

    if (!level || amount <= 0) return null;
    const pct = (total / maxTotal) * 100;
    const isAsk = type === 'ask';

    // Calculate USD equivalent for the price
    const priceNum = typeof level.price === 'string' ? parseFloat(level.price) : level.price;
    const usdEquivalent = pair.priceUSD ? formatUSD(pair.priceUSD * (priceNum / pair.price)) : null;

    return (
      <div className="relative flex items-center py-1 px-2 hover:bg-(--surface-elevated) group cursor-default">
        <div
          className={`absolute inset-y-0 right-0 ${isAsk ? 'bg-[#ef4444]/8' : 'bg-[#10b981]/8'}`}
          style={{ width: `${pct}%` }}
        />
        <div className="relative grid grid-cols-3 w-full gap-1 text-xs">
          <div className="flex flex-col">
            <span className={isAsk ? 'text-[#ef4444]' : 'text-[#10b981]'}>
              {formatPrice(level.price)}
            </span>
            {usdEquivalent && (
              <span className="text-[9px] text-(--text-dim)">
                {usdEquivalent}
              </span>
            )}
          </div>
          <span className="text-(--text-secondary) text-right">{amount.toFixed(3)}</span>
          <span className="text-(--text-dim) text-right">{total.toFixed(3)}</span>
        </div>
      </div>
    );
  }

  const midPrice = orderbook?.midPrice || 0;
  const spread = orderbook?.spread || 0;

  function calculateImbalance() {
    const bidVolume = bids.reduce((sum, level) => sum + (Number(level.amount) || 0), 0);
    const askVolume = asks.reduce((sum, level) => sum + (Number(level.amount) || 0), 0);
    const total = bidVolume + askVolume;
    if (total === 0) return { buy: 0, sell: 0 };
    return {
      buy: Math.round((bidVolume / total) * 1000) / 10,
      sell: Math.round((askVolume / total) * 1000) / 10
    };
  }

  const imbalance = calculateImbalance();

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex justify-center px-3 py-2.5 border-b border-(--border) flex-shrink-0">
        <div className="flex items-center gap-2">
          {[
            { key: 'book', label: t('showcase.tab.orderbook') },
            { key: 'trades', label: t('showcase.tab.trades') },
            { key: 'info', label: t('showcase.tab.info') },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as 'book' | 'trades' | 'info')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${activeView === tab.key
                ? 'bg-[#6366f1] text-white'
                : 'text-(--text-dim) hover:text-(--text-primary) bg-(--surface-elevated)'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orderbook - visible when book view is selected */}
      {activeView === 'book' && (
        <>
          {/* Col headers */}
          <div className="grid grid-cols-3 gap-1 px-3 py-1.5 border-b border-(--border)/50 flex-shrink-0">
            {[t('trade.price'), t('trade.amount'), t('trade.total')].map((h, i) => (
              <span key={h} className={`text-[10px] font-semibold text-(--text-dim) uppercase ${i > 0 ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>

          {/* Asks */}
          <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(50% - 80px)' }}>
            {asks.length === 0 ? (
              <div className="py-8 text-center text-xs text-(--text-dim)">{t('trade.noAsks')}</div>
            ) : (
              asks.slice().reverse().map((level, i) => (
                <LevelRow key={`ask-${i}`} level={level} type="ask" />
              ))
            )}
          </div>

          {/* Sell imbalance - below asks */}
          <div className="flex items-center px-3 py-1.5 bg-[#ef4444]/5 border-y border-(--border)/30 flex-shrink-0">
            <div className="flex-1 h-1.5 bg-(--surface) rounded-full overflow-hidden">
              <div className="h-full bg-[#ef4444] ml-auto" style={{ width: `${imbalance.sell}%` }} />
            </div>
            <span className="text-xs font-medium text-[#ef4444] ml-2">{imbalance.sell}%</span>
          </div>

          {/* Mid price and spread */}
          <div className="grid grid-cols-2 gap-3 px-3 py-2 bg-(--surface-elevated)/60 border-y border-(--border) flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-(--text-dim)">{t('trade.midPrice')}</span>
              <span className="text-xs font-medium text-(--text-primary)">
                ${midPrice > 0 ? formatPrice(midPrice) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-(--text-dim)">{t('trade.spread')}</span>
              <span className="text-xs font-medium text-(--text-primary)">
                {spread > 0 ? formatPrice(spread) : '-'}
              </span>
            </div>
          </div>

          {/* Buy imbalance - above bids */}
          <div className="flex items-center px-3 py-1.5 bg-[#10b981]/5 border-y border-(--border)/30 flex-shrink-0">
            <span className="text-xs font-medium text-[#10b981] mr-2">{imbalance.buy}%</span>
            <div className="flex-1 h-1.5 bg-(--surface) rounded-full overflow-hidden">
              <div className="h-full bg-[#10b981]" style={{ width: `${imbalance.buy}%` }} />
            </div>
          </div>

          {/* Bids */}
          <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(50% - 80px)' }}>
            {bids.length === 0 ? (
              <div className="py-8 text-center text-xs text-(--text-dim)">{t('trade.noBids')}</div>
            ) : (
              bids.map((level, i) => (
                <LevelRow key={`bid-${i}`} level={level} type="bid" />
              ))
            )}
          </div>
        </>
      )}

      {activeView === 'info' && (
        <div className="p-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid gap-3">
            <div className="rounded-2xl border border-(--border) bg-(--surface-elevated) p-4">
              <div className="flex items-center gap-3 mb-3">
                <TokenAvatar symbol={pair.baseToken.symbol} logo={pair.baseToken.logo} />
                <div>
                  <p className="text-[11px] text-(--text-dim)">Base token</p>
                  <p className="text-sm font-semibold text-(--text-primary)">{pair.baseToken.name} ({pair.baseToken.symbol})</p>
                </div>
              </div>
              <div className="grid gap-2 text-[11px] text-(--text-dim)">
                <div className="flex justify-between"><span>Decimals</span><span>{pair.baseToken.decimals ?? '—'}</span></div>
                <div className="flex justify-between gap-2 items-start">
                  <span>Address</span>
                  <div className="flex items-center justify-end gap-2 text-right">
                    <span className="break-all">{pair.baseToken.address}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(pair.baseToken.address, 'Base token address copied')}
                      className="p-1 opacity-60 hover:opacity-100 rounded hover:bg-(--surface-elevated) transition-colors"
                      title={`Copy base token address: ${pair.baseToken.address}`}
                    >
                      <Copy size={14} className="text-(--text-dim)" />
                    </button>
                  </div>
                </div>
                {pair.baseToken.website && (
                  <div className="flex justify-between gap-2">
                    <span>Website</span>
                    <a href={pair.baseToken.website} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      {pair.baseToken.website}
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.homepage && pair.baseToken.links.homepage.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Homepage</span>
                    <a href={pair.baseToken.links.homepage[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      {pair.baseToken.links.homepage[0]}
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.whitepaper && (
                  <div className="flex justify-between gap-2">
                    <span>Whitepaper</span>
                    <a href={pair.baseToken.links.whitepaper} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Whitepaper
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.blockchain_site && pair.baseToken.links.blockchain_site.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Explorer</span>
                    <a href={pair.baseToken.links.blockchain_site[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Explorer
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.twitter_screen_name && (
                  <div className="flex justify-between gap-2">
                    <span>Twitter</span>
                    <a href={`https://twitter.com/${pair.baseToken.links.twitter_screen_name}`} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right">
                      @{pair.baseToken.links.twitter_screen_name}
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.telegram_channel_identifier && (
                  <div className="flex justify-between gap-2">
                    <span>Telegram</span>
                    <a href={`https://t.me/${pair.baseToken.links.telegram_channel_identifier}`} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right">
                      @{pair.baseToken.links.telegram_channel_identifier}
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.discord_url && (
                  <div className="flex justify-between gap-2">
                    <span>Discord</span>
                    <a href={pair.baseToken.links.discord_url} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Discord
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.official_forum_url && pair.baseToken.links.official_forum_url.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Forum</span>
                    <a href={pair.baseToken.links.official_forum_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Forum
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.chat_url && pair.baseToken.links.chat_url.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Chat</span>
                    <a href={pair.baseToken.links.chat_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Chat
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.announcement_url && pair.baseToken.links.announcement_url.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Announcements</span>
                    <a href={pair.baseToken.links.announcement_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Announcements
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.snapshot_url && (
                  <div className="flex justify-between gap-2">
                    <span>Snapshot</span>
                    <a href={pair.baseToken.links.snapshot_url} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Snapshot
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.facebook_username && (
                  <div className="flex justify-between gap-2">
                    <span>Facebook</span>
                    <a href={`https://facebook.com/${pair.baseToken.links.facebook_username}`} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right">
                      @{pair.baseToken.links.facebook_username}
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.subreddit_url && (
                  <div className="flex justify-between gap-2">
                    <span>Reddit</span>
                    <a href={pair.baseToken.links.subreddit_url} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Reddit
                    </a>
                  </div>
                )}
                {pair.baseToken.links?.repos_url?.github && pair.baseToken.links.repos_url.github.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>GitHub</span>
                    <a href={pair.baseToken.links.repos_url.github[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      GitHub
                    </a>
                  </div>
                )}
              </div>
              {pair.baseToken.about && (
                <div className="mt-3 pt-3 border-t border-(--border)">
                  <p className="text-[11px] text-(--text-dim) uppercase mb-2">About</p>
                  <p className="text-xs text-(--text-primary) leading-relaxed">{pair.baseToken.about}</p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-(--border) bg-(--surface-elevated) p-4">
              <div className="flex items-center gap-3 mb-3">
                <TokenAvatar symbol={pair.quoteToken.symbol} logo={pair.quoteToken.logo} />
                <div>
                  <p className="text-[11px] text-(--text-dim)">Quote token</p>
                  <p className="text-sm font-semibold text-(--text-primary)">{pair.quoteToken.name} ({pair.quoteToken.symbol})</p>
                </div>
              </div>
              <div className="grid gap-2 text-[11px] text-(--text-dim)">
                <div className="flex justify-between"><span>Decimals</span><span>{pair.quoteToken.decimals ?? '—'}</span></div>
                <div className="flex justify-between gap-2 items-start">
                  <span>Address</span>
                  <div className="flex items-center justify-end gap-2 text-right">
                    <span className="break-all">{pair.quoteToken.address}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(pair.quoteToken.address, 'Quote token address copied')}
                      className="p-1 opacity-60 hover:opacity-100 rounded hover:bg-(--surface-elevated) transition-colors"
                      title={`Copy quote token address: ${pair.quoteToken.address}`}
                    >
                      <Copy size={14} className="text-(--text-dim)" />
                    </button>
                  </div>
                </div>
                {pair.quoteToken.website && (
                  <div className="flex justify-between gap-2">
                    <span>Website</span>
                    <a href={pair.quoteToken.website} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      {pair.quoteToken.website}
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.homepage?.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Homepage</span>
                    <a href={pair.quoteToken.links.homepage[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      {pair.quoteToken.links.homepage[0]}
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.whitepaper && (
                  <div className="flex justify-between gap-2">
                    <span>Whitepaper</span>
                    <a href={pair.quoteToken.links.whitepaper} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Whitepaper
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.blockchain_site?.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Explorer</span>
                    <a href={pair.quoteToken.links.blockchain_site[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Explorer
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.twitter_screen_name && (
                  <div className="flex justify-between gap-2">
                    <span>Twitter</span>
                    <a href={`https://twitter.com/${pair.quoteToken.links.twitter_screen_name}`} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right">
                      @{pair.quoteToken.links.twitter_screen_name}
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.telegram_channel_identifier && (
                  <div className="flex justify-between gap-2">
                    <span>Telegram</span>
                    <a href={`https://t.me/${pair.quoteToken.links.telegram_channel_identifier}`} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right">
                      @{pair.quoteToken.links.telegram_channel_identifier}
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.discord_url && (
                  <div className="flex justify-between gap-2">
                    <span>Discord</span>
                    <a href={pair.quoteToken.links.discord_url} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Discord
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.official_forum_url?.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Forum</span>
                    <a href={pair.quoteToken.links.official_forum_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Forum
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.chat_url?.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Chat</span>
                    <a href={pair.quoteToken.links.chat_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Chat
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.announcement_url?.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Announcements</span>
                    <a href={pair.quoteToken.links.announcement_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Announcements
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.snapshot_url && (
                  <div className="flex justify-between gap-2">
                    <span>Snapshot</span>
                    <a href={pair.quoteToken.links.snapshot_url} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Snapshot
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.facebook_username && (
                  <div className="flex justify-between gap-2">
                    <span>Facebook</span>
                    <a href={`https://facebook.com/${pair.quoteToken.links.facebook_username}`} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right">
                      @{pair.quoteToken.links.facebook_username}
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.subreddit_url && (
                  <div className="flex justify-between gap-2">
                    <span>Reddit</span>
                    <a href={pair.quoteToken.links.subreddit_url} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      Reddit
                    </a>
                  </div>
                )}
                {pair.quoteToken.links?.repos_url?.github?.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>GitHub</span>
                    <a href={pair.quoteToken.links.repos_url.github[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                      GitHub
                    </a>
                  </div>
                )}
              </div>
              {pair.quoteToken.about && (
                <div className="mt-3 pt-3 border-t border-(--border)">
                  <p className="text-[11px] text-(--text-dim) uppercase mb-2">About</p>
                  <p className="text-xs text-(--text-primary) leading-relaxed">{pair.quoteToken.about}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Trades (toggled) */}
      {activeView === 'trades' && (
        <div className="border-t border-(--border) flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-3 px-3 py-1.5 border-b border-(--border)/50 flex-shrink-0">
            {['Time', 'Size', 'Price'].map((h, i) => (
              <span key={h} className={`text-[10px] font-semibold text-(--text-dim) uppercase ${i > 0 ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>
          <div className="overflow-y-auto flex-1">
            {trades && trades.length > 0 ? (
              trades.slice(0, 50).map(trade => {
                const amountDisplay = fromWei(String(trade.amount), tradeBaseDecimals);
                const priceNum = typeof trade.price === 'string' ? parseFloat(trade.price) : trade.price;
                const usdEquivalent = pair.priceUSD ? formatUSD(pair.priceUSD * (priceNum / pair.price)) : null;
                const explorerHash = trade.tx_hash || trade.tx_hash_buy || trade.tx_hash_sell;
                const explorerUrl = explorerHash ? getExplorerUrl(explorerHash, pair.network) : null;
                console.debug('[DesktopTrades] trade render', { id: trade.id, rawAmount: trade.amount, baseDecimals: tradeBaseDecimals, amountDisplay });

                return (
                  <a
                    key={trade.id}
                    href={explorerUrl || '#'}
                    target={explorerUrl ? '_blank' : undefined}
                    rel={explorerUrl ? 'noopener noreferrer' : undefined}
                    className={`grid grid-cols-3 px-3 py-1 transition-colors text-xs ${explorerUrl ? 'hover:bg-(--surface-elevated) cursor-pointer' : 'hover:bg-(--surface-elevated)'}`}
                  >
                    <span className="text-(--text-dim)">
                      {new Date(trade.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                    <span className="text-(--text-secondary) text-right">{parseFloat(amountDisplay).toFixed(4)}</span>
                    <div className="flex flex-col items-end">
                      <span className={`font-medium ${trade.side === 'buy' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {formatPrice(trade.price)}
                      </span>
                      {usdEquivalent && (
                        <span className="text-[9px] text-(--text-dim)">
                          {usdEquivalent}
                        </span>
                      )}
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-(--text-dim)">No trades yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recent Trades Panel ──────────────────────────────────────────
function RecentTradesPanel({ trades, pair }: { trades: RecentTrade[]; pair: Pair }) {
  const { pairs } = useStore();
  const currentPair = pairs.find(p => p.id === pair.id) || pair;
  const initialDecimals = getTokenDecimals(currentPair.baseToken);
  const [baseDecimals, setBaseDecimals] = useState<number>(initialDecimals);

  useEffect(() => {
    const tokenAddress = currentPair.baseToken?.address || pair.baseToken?.address;
    const network = pair.network || currentPair.network;
    if (!tokenAddress || !network) return;

    let canceled = false;
    console.debug('[DesktopRecentTrades] fetching base token decimals', tokenAddress, network);

    fetchTokenDecimals(tokenAddress, network as 'bsc' | 'base' | 'solana')
      .then((decimals) => {
        if (!canceled) {
          console.debug('[DesktopRecentTrades] resolved base token decimals', tokenAddress, decimals);
          setBaseDecimals(decimals);
        }
      })
      .catch((error) => {
        console.error('[DesktopRecentTrades] error fetching base token decimals', tokenAddress, network, error);
      });

    return () => { canceled = true; };
  }, [currentPair.baseToken?.address, currentPair.network, pair.baseToken?.address, pair.network]);

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-(--border) flex items-center gap-2">
        <Clock size={14} className="text-(--text-dim)" />
        <h3 className="text-sm font-semibold text-(--text-primary)">Recent Trades</h3>
      </div>
      <div className="grid grid-cols-3 px-4 py-1.5 border-b border-(--border)/50">
        {['Price', 'Amount', 'Time'].map((h, i) => (
          <span key={h} className={`text-[10px] font-semibold text-(--text-dim) uppercase ${i > 0 ? 'text-right' : ''}`}>{h}</span>
        ))}
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 180 }}>
        {trades.map(trade => {
          const amountDisplay = fromWei(String(trade.amount), baseDecimals);
          const priceNum = typeof trade.price === 'string' ? parseFloat(trade.price) : trade.price;
          const usdEquivalent = pair.priceUSD ? formatUSD(pair.priceUSD * (priceNum / pair.price)) : null;
          const explorerHash = trade.tx_hash || trade.tx_hash_buy || trade.tx_hash_sell;
          const explorerUrl = explorerHash ? getExplorerUrl(explorerHash, pair.network) : null;

          return (
            <a
              key={trade.id}
              href={explorerUrl || '#'}
              target={explorerUrl ? '_blank' : undefined}
              rel={explorerUrl ? 'noopener noreferrer' : undefined}
              className={`grid grid-cols-3 px-4 py-1.5 transition-colors text-xs ${explorerUrl ? 'hover:bg-(--surface-elevated) cursor-pointer' : 'hover:bg-(--surface-elevated)'}`}
            >
              <div className="flex flex-col">
                <span className={`font-medium ${trade.side === 'buy' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {formatPrice(trade.price)}
                </span>
                {usdEquivalent && (
                  <span className="text-[9px] text-(--text-dim)">
                    {usdEquivalent}
                  </span>
                )}
              </div>
              <span className="text-(--text-secondary) text-right">{parseFloat(amountDisplay).toFixed(4)}</span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-(--text-dim) text-right">
                  {new Date(trade.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
                {explorerUrl && (
                  <ExternalLink size={12} className="text-(--text-dim) opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trade Panel ──────────────────────────────────────────────────
type OrderSide = 'buy' | 'sell';
type OrderType = 'limit' | 'market';
type AdvancedOption = 'none' | 'postOnly' | 'takeProfit' | 'stopLoss' | 'ladder';

function TradePanelWidget({ pair, onOrderbookUpdate }: { pair: Pair; onOrderbookUpdate?: () => void }) {
  const { t } = useTranslation();
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [advanced, setAdvanced] = useState<AdvancedOption>('none');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [price, setPrice] = useState(formatInputNumber(pair.price));
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [expiration, setExpiration] = useState('20');
  const [expirationType, setExpirationType] = useState<'minutes' | 'days'>('minutes');
  const [nonce, setNonce] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Trigger price for TP/SL
  const [triggerPrice, setTriggerPrice] = useState('');

  useEffect(() => {
    if (orderType === 'limit' && (!price || price === '')) {
      setPrice(formatInputNumber(pair.price));
    }
  }, [pair.id, pair.price, orderType, price]);

  // Ladder state
  const [ladderLevels, setLadderLevels] = useState('5');
  const [ladderPriceStart, setLadderPriceStart] = useState('');
  const [ladderPriceEnd, setLadderPriceEnd] = useState('');

  // When ladder is selected, force sell side only
  const effectiveSide = advanced === 'ladder' ? 'sell' : side;

  const { isAuthenticated, user, primaryWallet } = useDynamicContext();
  const storeConnected = useStore(s => s.isConnected);
  const storeWalletAddress = useStore(s => s.walletAddress);

  const { createOrder, loading } = useOrderCreation();
  const { showToast } = useToast();

  const network = ['bsc', 'base', 'solana'].includes(pair.network)
    ? pair.network as 'bsc' | 'base' | 'solana'
    : 'bsc';
  useFillNotifications(network);

  // Use Dynamic wallet address if available, otherwise use store wallet address
  const walletAddress = primaryWallet?.address || storeWalletAddress || user?.verifiedCredentials?.[0]?.address;
  const { sendDeposit } = useSolanaDeposit(primaryWallet, walletAddress);

  const isConnected = !!(isAuthenticated || user?.verifiedCredentials?.length || storeConnected);

  const { baseBalance, quoteBalance, loading: balancesLoading, refetch: refetchBalances, error: balancesError } = useBalances(
    pair.baseToken.address,
    pair.quoteToken.address,
    walletAddress || undefined,
    network,
    pair.baseToken.decimals || 18,
    pair.quoteToken.decimals || 18
  );

  // Determine if TP/SL is selected
  const isTakeProfitOrStopLoss = advanced === 'takeProfit' || advanced === 'stopLoss';

  const total = useMemo(() => {
    const p = parseFloat(price || String(pair.price));
    const a = parseFloat(amount || '0');
    return (p * a).toFixed(6);
  }, [price, amount, pair.price]);

  const { baseTokenUSDValue, quoteTokenUSDValue } = useUSDValues(
    pair.baseToken.address,
    pair.quoteToken.address,
    amount,
    parseFloat(price || String(pair.price)),
    network
  );

  const parsedAmount = parseFloat(amount || '0');
  const usdValueFromPair = parsedAmount > 0 && pair.priceUSD != null
    ? formatUSD(parsedAmount * pair.priceUSD)
    : null;
  const displayAmountUSD = baseTokenUSDValue || usdValueFromPair;
  const displayTotalUSD = quoteTokenUSDValue || usdValueFromPair;

  const handlePct = useCallback((pct: number) => {
    const balance = effectiveSide === 'buy'
      ? parseFloat(quoteBalance?.formatted || '0')
      : parseFloat(baseBalance?.formatted || '0');
    const p = parseFloat(price || String(pair.price));
    if (effectiveSide === 'buy' && p > 0) {
      setAmount(((balance * pct) / p).toFixed(6));
    } else {
      setAmount((balance * pct).toFixed(6));
    }
  }, [effectiveSide, quoteBalance, baseBalance, price, pair.price]);

  const handleSubmit = async () => {
    if (!isConnected) return;




    // Validation for TP/SL - require trigger price
    if ((advanced === 'takeProfit' || advanced === 'stopLoss') && !triggerPrice) {
      setErrorMsg('Please enter trigger price');
      return;
    }

    // Validation for ladder - require ladder config
    if (advanced === 'ladder' && (!ladderPriceStart || !ladderPriceEnd || !ladderLevels)) {
      setErrorMsg(t('trade.enterLadderConfiguration'));
      return;
    }

    // Validation for amount - always required
    if (!amount) {
      setErrorMsg(t('trade.enterAmountValue'));
      return;
    }

    // Validation for price - required for limit orders, optional for market
    if (orderType === 'limit' && !price && advanced !== 'ladder') {
      setErrorMsg(t('trade.enterPrice'));
    }

    setErrorMsg('');

    // Calculate expiration in minutes
    const expirationMinutes = expirationType === 'days'
      ? parseInt(expiration) * 24 * 60
      : parseInt(expiration);

    // Determine order type - TP/SL are their own order types
    const finalOrderType = advanced === 'takeProfit' ? 'take_profit' as const
      : advanced === 'stopLoss' ? 'stop_loss' as const
        : orderType;



    // Create order and wait for backend confirmation
    try {
      let depositResult: any;
      let depositMemoForOrder: string | undefined;
      let depositTypeForOrder: 'sol' | 'spl' | undefined;
      let depositTokenMintForOrder: string | undefined;
      let depositAmountForOrder: string | undefined;

      if (network === 'solana') {
        const orderPrice = price || String(pair.price);
        const depositToken = effectiveSide === 'buy' ? pair.quoteToken : pair.baseToken;
        depositTypeForOrder = depositToken.symbol?.toLowerCase() === 'sol' ? 'sol' : 'spl';
        depositTokenMintForOrder = depositTypeForOrder === 'spl' ? depositToken.address : undefined;
        depositAmountForOrder = effectiveSide === 'buy'
          ? (parseFloat(amount) * parseFloat(orderPrice)).toString()
          : amount;
        depositMemoForOrder = walletAddress ? getSolanaDepositMemo(walletAddress) : undefined;

        depositResult = await sendDeposit(
          depositAmountForOrder,
          depositTypeForOrder,
          depositTokenMintForOrder,
          depositMemoForOrder,
        );

        if (!depositResult.success) {
          setErrorMsg(depositResult.error || 'Failed to send custody deposit before order creation');
          return;
        }
      }

      const result = await createOrder({
        pairId: pair.id,
        side: effectiveSide,
        orderType: finalOrderType,
        price: advanced === 'ladder' ? ladderPriceStart : (advanced === 'takeProfit' || advanced === 'stopLoss' ? triggerPrice : price),
        amount,
        network,
        receiver: receiver || undefined,
        nonce: nonce || undefined,
        advanced: advanced === 'ladder' ? undefined : (advanced === 'none' ? undefined : advanced),
        triggerPrice: (advanced === 'takeProfit' || advanced === 'stopLoss') ? triggerPrice : undefined,
        expiration: expirationMinutes || 20,
        isLadder: advanced === 'ladder',
        ladderConfig: advanced === 'ladder' ? {
          priceStart: ladderPriceStart,
          priceEnd: ladderPriceEnd,
          levels: parseInt(ladderLevels) || 5,
        } : undefined,
        depositMemo: depositMemoForOrder,
        depositAmount: depositAmountForOrder,
        depositType: depositTypeForOrder,
        depositTokenMint: depositTokenMintForOrder,
        depositTxHash: depositResult?.txId,
      });

      // Order creation successful
      setAmount('');
      setPrice('');
      setErrorMsg('');

      // Trigger orderbook update to show the new order via WebSocket
      setTimeout(() => onOrderbookUpdate?.(), 100);

      showToast({
        title: 'Order created successfully',
        description: 'Your order has been confirmed and added to the orderbook.',
        variant: 'success',
      });
    } catch (err: any) {
      console.error('❌ [TradePanelWidget] createOrder hook error:', err);
      setErrorMsg(t('trade.orderFailed'));
    }
  };

  const isBuy = effectiveSide === 'buy';
  const actionColor = isBuy ? '#10b981' : '#ef4444';
  const actionHover = isBuy ? '#34d399' : '#f87171';

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
      {/* Buy/Sell toggle */}
      <div className="flex p-1.5 gap-1 border-b border-(--border)">
        {(['buy', 'sell'] as OrderSide[]).map(s => (
          <button
            key={s}
            onClick={() => { if (advanced !== 'ladder') setSide(s); }}
            disabled={advanced === 'ladder'}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${side === s
              ? s === 'buy' ? 'bg-[#10b981] text-white shadow-sm shadow-[#10b981]/20' : 'bg-[#ef4444] text-white shadow-sm shadow-[#ef4444]/20'
              : advanced === 'ladder'
                ? 'text-(--text-dim) cursor-not-allowed opacity-50'
                : 'text-(--text-dim) hover:text-(--text-primary) hover:bg-(--surface-elevated)'
              }`}
          >
            {s === 'buy' ? t('trade.buy') : t('trade.sell')}
            {advanced === 'ladder' && s === 'sell' && ` (${t('trade.ladder')})`}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Order type selector - hide for TP/SL and Ladder */}
        {advanced !== 'takeProfit' && advanced !== 'stopLoss' && advanced !== 'ladder' ? (
          <div className="space-y-2">
            <div className="flex gap-1 p-1 bg-(--surface-elevated) rounded-lg">
              {(['limit', 'market'] as OrderType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${orderType === t ? 'bg-[#6366f1] text-white' : 'text-(--text-dim) hover:text-(--text-primary)'
                    }`}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${showAdvanced ? 'bg-[#6366f1] text-white' : 'text-(--text-dim) hover:text-(--text-primary)'
                  }`}
              >
                {showAdvanced ? '▼' : '▲'}
              </button>
            </div>

            {/* Post Only Toggle */}
            <label
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${advanced === 'postOnly'
                ? 'bg-[#6366f1]/20 border border-[#6366f1]'
                : 'bg-(--surface-elevated) border border-(--border)'
                }`}
            >
              <span className="text-xs font-medium text-(--text-primary)">{t('trade.postOnly')}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={advanced === 'postOnly'}
                  onChange={() => setAdvanced(advanced === 'postOnly' ? 'none' : 'postOnly')}
                  className="sr-only peer"
                  disabled={orderType === 'market'}
                />
                <div className={`w-9 h-5 rounded-full transition-colors peer-disabled:opacity-50 ${advanced === 'postOnly' ? 'bg-[#6366f1]' : 'bg-(--surface-hover)'
                  }`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${advanced === 'postOnly' ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                </div>
              </div>
            </label>
            {orderType === 'market' && (
              <p className="text-xs text-(--text-dim)">{t('trade.postOnlyLimitOnly')}</p>
            )}
          </div>
        ) : (
          /* TP/SL or Ladder selected - show it as the active order type with toggle */
          <div className="flex gap-1 p-1 bg-(--surface-elevated) rounded-lg">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors ${advanced === 'ladder' ? 'bg-[#6366f1] text-white' :
                advanced === 'takeProfit' ? 'bg-[#10b981] text-white' : 'bg-[#ef4444] text-white'
                }`}
            >
              {advanced === 'takeProfit' ? 'Take Profit' : advanced === 'stopLoss' ? 'Stop Loss' : 'Ladder'}
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-2 py-1 rounded-md text-xs font-semibold text-(--text-dim)"
            >
              {showAdvanced ? '▼' : '▲'}
            </button>
          </div>
        )}

        {/* Advanced dropdown - shows only when showAdvanced is true (user clicks to toggle) */}
        {showAdvanced && (
          <div className="flex gap-1 p-1 bg-(--surface-elevated) rounded-lg">
            {[
              { id: 'none' as AdvancedOption, label: t('trade.none') },
              { id: 'takeProfit' as AdvancedOption, label: 'TP' },
              { id: 'stopLoss' as AdvancedOption, label: 'SL' },
              { id: 'ladder' as AdvancedOption, label: t('trade.ladder') },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setAdvanced(opt.id);
                  setShowAdvanced(false);
                  // When ladder is selected, automatically switch to sell side
                  if (opt.id === 'ladder') {
                    setSide('sell');
                  }
                }}
                className={`flex-1 py-1 rounded-md text-xs font-medium capitalize transition-colors ${advanced === opt.id ? 'bg-[#6366f1] text-white' : 'text-(--text-dim) hover:text-(--text-primary)'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Trigger Price for TP/SL - first input */}
        {(advanced === 'takeProfit' || advanced === 'stopLoss') && (
          <div className="relative">
            <Input
              label={t('trade.triggerPrice')}
              placeholder={t('trade.triggerPricePlaceholder')}
              value={triggerPrice}
              onChange={e => setTriggerPrice(e.target.value)}
              type="number"
              required
            />
            <span className="absolute right-3 bottom-[9px] text-xs text-(--text-dim) pointer-events-none">
              {pair.quoteToken.symbol}
            </span>
          </div>
        )}

        {/* Ladder Config */}
        {advanced === 'ladder' && (
          <div className="rounded-xl border border-(--border) bg-gradient-to-b from-(--surface-elevated) to-(--surface) overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-(--border) flex items-center gap-2">
              <svg className="w-4 h-4 text-(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
              <span className="text-sm font-semibold text-(--text-primary) tracking-wide">{t('trade.ladderConfiguration')}</span>
              <span className="ml-auto text-xs text-(--text-dim)">{t('trade.sellOnly')}</span>
            </div>

            {/* Input Fields */}
            <div className="p-4 space-y-3">
              {/* Levels - Full Width */}
              <div className="group">
                <label className="block text-xs font-medium text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  {t('trade.levels')}
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-(--background) border border-(--border) rounded-lg pl-3 pr-12 py-2.5
                      text-(--text-primary) text-sm placeholder-(--text-dim)
                      focus:outline-none focus:ring-2 focus:ring-(--primary)/30 focus:border-(--primary)
                      hover:border-(--text-dim) transition-all duration-200
                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="5"
                    value={ladderLevels}
                    onChange={e => setLadderLevels(e.target.value)}
                    type="number"
                    min="1"
                    max="20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--text-dim) font-medium pointer-events-none">
                    {t('trade.tiers')}
                  </span>
                </div>
              </div>

              {/* Price Range - Two Column Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Price Start */}
                <div className="group">
                  <label className="block text-xs font-medium text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                    {t('trade.startPrice')}
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-(--background) border border-(--border) rounded-lg pl-3 pr-16 py-2.5
                        text-(--text-primary) text-sm placeholder-(--text-dim)
                        focus:outline-none focus:ring-2 focus:ring-(--primary)/30 focus:border-(--primary)
                        hover:border-(--text-dim) transition-all duration-200
                        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={ladderPriceStart}
                      onChange={e => setLadderPriceStart(e.target.value)}
                      type="number"
                      step="any"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--text-dim) font-medium pointer-events-none">
                      {pair.quoteToken.symbol}
                    </span>
                  </div>
                </div>

                {/* Price End */}
                <div className="group">
                  <label className="block text-xs font-medium text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                    {t('trade.endPrice')}
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-(--background) border border-(--border) rounded-lg pl-3 pr-16 py-2.5
                        text-(--text-primary) text-sm placeholder-(--text-dim)
                        focus:outline-none focus:ring-2 focus:ring-(--primary)/30 focus:border-(--primary)
                        hover:border-(--text-dim) transition-all duration-200
                        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={ladderPriceEnd}
                      onChange={e => setLadderPriceEnd(e.target.value)}
                      type="number"
                      step="any"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--text-dim) font-medium pointer-events-none">
                      {pair.quoteToken.symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Range Indicator */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1 rounded-full bg-(--border) overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-(--primary) to-(--accent) rounded-full" style={{ width: '60%' }} />
                </div>
              </div>

              {/* Helper Text */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-(--background)/50 border border-(--border)/50">
                <svg className="w-3.5 h-3.5 text-(--primary) mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  Orders will be distributed across <span className="text-(--text-primary) font-semibold">{ladderLevels || 5}</span> price levels between start and end prices
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Available balance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-(--text-dim)">{t('trade.available')}</span>
          {balancesError ? (
            <span className="text-(--text-dim)" title={balancesError}>{t('trade.error')}</span>
          ) : balancesLoading ? (
            <span className="text-(--text-dim)">{t('trade.loading')}</span>
          ) : !walletAddress ? (
            <span className="text-(--text-dim)">{t('trade.connectWallet')}</span>
          ) : isBuy ? (
            <span className="text-(--text-primary) font-medium">
              {quoteBalance?.formatted || '0.0000'} {pair.quoteToken.symbol}
            </span>
          ) : (
            <span className="text-(--text-primary) font-medium">
              {baseBalance?.formatted || '0.0000'} {pair.baseToken.symbol}
            </span>
          )}
        </div>

        {/* Price (limit only, not for TP/SL/Ladder) */}
        {orderType === 'limit' && advanced !== 'takeProfit' && advanced !== 'stopLoss' && advanced !== 'ladder' && (
          <div className="relative">
            <Input
              label={t('trade.price')}
              placeholder={formatPrice(pair.price)}
              value={price}
              onChange={e => setPrice(e.target.value)}
              type="number"
            />
            <span className="absolute right-3 bottom-[9px] text-xs text-(--text-dim) pointer-events-none">
              {pair.quoteToken.symbol}
            </span>
          </div>
        )}

        {/* Amount */}
        <div className="relative">
          <Input
            label={t('trade.amount')}
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            type="number"
          />
          <span className="absolute right-3 bottom-[9px] text-xs text-(--text-dim) pointer-events-none">
            {pair.baseToken.symbol}
          </span>
        </div>

        {/* USD Equivalent of Amount */}
        {displayAmountUSD && (
          <div className="text-xs text-(--text-dim)">
            ≈ {displayAmountUSD}
          </div>
        )}

        {/* % quick-fill */}
        <div className="grid grid-cols-4 gap-1.5">
          {[25, 50, 75, 100].map(p => (
            <button
              key={p}
              onClick={() => handlePct(p / 100)}
              className="py-1 text-xs font-semibold rounded-md bg-(--surface-elevated) text-(--text-dim) hover:bg-(--surface-hover) hover:text-(--text-primary) border border-(--border) transition-colors"
            >
              {p}%
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="relative">
          <Input label={t('trade.total')} placeholder="0.00" value={total} disabled />
          <span className="absolute right-3 bottom-[9px] text-xs text-(--text-dim) pointer-events-none">
            {pair.quoteToken.symbol}
          </span>
        </div>

        {/* USD Equivalent of Total */}
        {displayTotalUSD && (
          <div className="text-xs text-(--text-dim)">
            ≈ {displayTotalUSD}
          </div>
        )}

        {/* Receiver (Optional) */}
        <Input
          label={t('trade.receiverOptional')}
          placeholder={t('trade.receiverPlaceholder')}
          value={receiver}
          onChange={e => setReceiver(e.target.value)}
        />
        <p className="text-xs text-(--text-dim) mt-1 mb-2">{t('trade.receiverHelp')}</p>

        {/* Expiration with minutes/days toggle */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                label={t('trade.expiration')}
                placeholder="20"
                value={expiration}
                onChange={e => setExpiration(e.target.value)}
                type="number"
              />
            </div>
            <div className="flex items-end pb-2">
              <div className="flex gap-1 bg-(--surface-elevated) rounded-md p-1">
                <button
                  type="button"
                  onClick={() => setExpirationType('minutes')}
                  className={`px-2 py-1 text-xs rounded ${expirationType === 'minutes' ? 'bg-[#6366f1] text-white' : 'text-(--text-dim)'}`}
                >
                  Min
                </button>
                <button
                  type="button"
                  onClick={() => setExpirationType('days')}
                  className={`px-2 py-1 text-xs rounded ${expirationType === 'days' ? 'bg-[#6366f1] text-white' : 'text-(--text-dim)'}`}
                >
                  Days
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nonce (Optional) */}
        <Input
          label={t('trade.nonceOptional')}
          placeholder={t('trade.noncePlaceholder')}
          value={nonce}
          onChange={e => setNonce(e.target.value)}
          type="number"
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!isConnected || (!amount) || loading}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isConnected && amount ? `linear-gradient(135deg, ${actionColor}, ${actionHover})` : undefined,
            backgroundColor: !isConnected || !amount ? 'var(--surface-elevated)' : undefined,
            color: !isConnected || !amount ? 'var(--text-dim)' : 'white',
            boxShadow: isConnected && amount ? `0 4px 20px ${actionColor}40` : undefined,
          }}
        >
          {loading
            ? t('trade.placingOrder')
            : !isConnected
              ? t('trade.connectWallet')
              : !amount
                ? t('trade.enterAmount').replace('{{symbol}}', pair.baseToken.symbol)
                : `${isBuy ? t('trade.buy') : t('trade.sell')} ${pair.baseToken.symbol}`}
        </button>

        {/* Error message */}
        {errorMsg && (
          <div className="text-xs text-[#ef4444] text-center py-2">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Desktop Trading Page ─────────────────────────────────────────
interface DesktopTradingPageProps {
  pair: Pair;
}

export function DesktopTradingPage({ pair }: DesktopTradingPageProps) {
  const { orderbook, loading: orderbookLoading, refetch, aggressiveRefetch } = useOrderbook(pair.id);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);

  usePairWebsocket(pair.id, {
    onOrderbookUpdate: refetch,
    onTradeUpdate: (trade) => {
      const recentTrade: RecentTrade = {
        id: trade.id.toString(),
        price: parseFloat(trade.price),
        amount: parseFloat(trade.amount),
        side: trade.side as 'buy' | 'sell',
        time: new Date(trade.time).toISOString(),
        tx_hash: trade.tx_hash,
        tx_hash_buy: trade.tx_hash_buy,
        tx_hash_sell: trade.tx_hash_sell,
        decimals: trade.decimals,
      };
      setRecentTrades((prev) => [recentTrade, ...prev].slice(0, 50));
    },
  });

  // Create empty orderbook when none available
  const emptyOrderbook: Orderbook = useMemo(() => ({
    pairId: pair.id,
    bids: [],
    asks: [],
    spread: 0,
    lastUpdated: new Date().toISOString(),
  }), [pair.id]);

  // Use real orderbook directly - no optimistic merging needed
  const displayOrderbook = orderbook || emptyOrderbook;

  React.useEffect(() => {
    let mounted = true;
    const fetchRecentTrades = async () => {
      try {
        const trades = await getTrades(pair.id, 50);
        if (mounted) setRecentTrades(trades);
      } catch (error) {
        console.error(error);
      }
    };

    fetchRecentTrades();
    const interval = window.setInterval(fetchRecentTrades, 5000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [pair.id]);

  return (
    <div className="flex flex-col flex-1 bg-(--background) overflow-hidden">
      {/* Ticker bar */}
      <PairTickerBar pair={pair} />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: chart */}
        <div className="flex-1 min-w-0 flex flex-col p-4 overflow-hidden">
          {/* Chart */}
          <div className="flex-1 min-h-0">
            <CandlestickChart
              pair={pair.id}
              quoteTokenSymbol={pair.quoteToken.symbol}
              quoteTokenAddress={pair.quoteToken.address}
              price={pair.price}
              poolAddress={pair.pairAddress}
              network={pair.network as 'bsc' | 'base' | 'solana' | 'arbitrum' | 'avalanche' | 'polygon' | 'ethereum' || 'bsc'}
            />
          </div>
        </div>

        {/* Middle: Orderbook */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 p-4 border-l border-(--border) overflow-auto">
          <OrderbookPanel orderbook={displayOrderbook} trades={recentTrades} pair={pair} />
        </div>

        {/* Right: trade panel */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-3 p-4 border-l border-(--border) overflow-auto">
          <TradePanelWidget pair={pair} onOrderbookUpdate={aggressiveRefetch} />
        </div>
      </div>
    </div>
  );
}

