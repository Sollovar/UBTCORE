import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown, Wallet, ExternalLink, Sun, Moon, Copy } from 'lucide-react';
import type { Pair, OrderbookLevel, Orderbook, RecentTrade } from '../../types';
import { CandlestickChart } from '../common/CandlestickChart';
import { Input } from '../common/Input';
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { tokenColor } from '../../utils/mockData';
import { formatPrice, formatPercent, formatNumber, formatUSD, calculateQuoteTokenUSDValue, formatInputNumber } from '../../utils/formatters';
import { fromWei, getTokenDecimals, fetchTokenDecimals } from '../../utils/amount';
import { useStore } from '../../stores/useStore';
import { useOrderbook } from '../../hooks/useOrderbook';
import { usePairWebsocket } from '../../hooks/usePairWebsocket';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useOrderCreation } from '../../hooks/useOrderCreation';
import { useFillNotifications } from '../../hooks/useFillNotifications';
import { useSolanaDeposit } from '../../hooks/useSolanaDeposit';
import { getSolanaDepositMemo } from '../../utils/contracts';
import { useBalances } from '../../hooks/useTokenBalance';
import { useUSDValues } from '../../hooks/useTokenUSDPrice';
import { useToast } from '../common/Toast';
import { Button } from '../common/Button';
import { useTranslation } from '../../i18n/i18n';
import { getTrades } from '../../services/orderbook';
import { getExplorerUrl } from '../../utils/constants';

// ─── Token Avatar ─────────────────────────────────────────────────
function TokenAvatar({ symbol, logo, size = 24 }: { symbol: string; logo?: string; size?: number }) {
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
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}cc, ${color}55)`,
        border: `1.5px solid ${color}44`,
        fontSize: size * 0.36,
      }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

// ─── Tab types ────────────────────────────────────────────────────
type Tab = 'chart' | 'book' | 'trade' | 'history' | 'info';

// ─── Orderbook Tab ────────────────────────────────────────────────
function OrderbookTab({ orderbook }: { orderbook: Orderbook }) {
  const { t } = useTranslation();
  const [side, setSide] = useState<'asks' | 'bids' | 'both'>('both');

  const asks = orderbook?.asks || [];
  const bids = orderbook?.bids || [];

  const maxTotal = Math.max(
    ...asks.map(a => a.total),
    ...bids.map(b => b.total),
    1,
  );

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

  function Row({ level, type }: { level: OrderbookLevel; type: 'ask' | 'bid' }) {
    if (!level || level.amount <= 0) return null;
    const pct = (level.total / maxTotal) * 100;
    const isAsk = type === 'ask';
    return (
      <div className="relative flex items-center py-1.5 px-4">
        <div
          className={`absolute inset-y-0 right-0 ${isAsk ? 'bg-[#ef4444]/8' : 'bg-[#10b981]/8'}`}
          style={{ width: `${pct}%` }}
        />
        <div className="relative grid grid-cols-3 w-full text-xs gap-1">
          <span className={isAsk ? 'text-[#ef4444]' : 'text-[#10b981]'}>
            {formatPrice(level.price)}
          </span>
          <span className="text-(--text-secondary) text-right">{Number(level.amount).toFixed(3)}</span>
          <span className="text-(--text-dim) text-right">{Number(level.total).toFixed(3)}</span>
        </div>
      </div>
    );
  }

  const midPrice = (bids[0]?.price && asks[0]?.price)
    ? (bids[0].price + asks[0].price) / 2
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Side filter */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-(--border) flex-shrink-0">
        {(['both', 'bids', 'asks'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${side === s
                ? 'bg-[#6366f1] text-white'
                : 'bg-(--surface-elevated) text-(--text-dim) border border-(--border)'
              }`}
          >
            {t(`trade.${s}`)}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-4 py-1.5 border-b border-(--border)/50 flex-shrink-0">
        {[t('trade.price'), t('trade.amount'), t('trade.total')].map((h, i) => (
          <span key={h} className={`text-[10px] font-semibold text-(--text-dim) uppercase ${i > 0 ? 'text-right' : ''}`}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="overflow-y-auto flex-1">
        {/* Asks */}
        {(side === 'asks' || side === 'both') && (
          <div>
            {asks.length === 0 ? (
              <div className="py-8 text-center text-xs text-(--text-dim)">{t('trade.noAsks')}</div>
            ) : (
              (side === 'both' ? asks.slice(0, 8) : asks)
                .slice()
                .reverse()
                .map((level, i) => <Row key={`ask-${i}`} level={level} type="ask" />)
            )}
          </div>
        )}

        {/* Sell imbalance - below asks */}
        {side === 'both' && (
          <div className="flex items-center px-4 py-1.5 bg-[#ef4444]/5 border-y border-(--border)/30">
            <div className="flex-1 h-1.5 bg-(--surface) rounded-full overflow-hidden">
              <div className="h-full bg-[#ef4444] ml-auto" style={{ width: `${imbalance.sell}%` }} />
            </div>
            <span className="text-xs font-medium text-[#ef4444] ml-2">{imbalance.sell}%</span>
          </div>
        )}

        {/* Mid price bar (both mode) */}
        {side === 'both' && (
          <div className="flex items-center justify-between px-4 py-2 bg-(--surface-elevated)/60 border-y border-(--border)/50">
            <span className="text-xs text-(--text-dim)">{t('trade.midPrice')}</span>
            <span className="text-sm font-medium text-(--text-primary)">
              ${midPrice > 0 ? formatPrice(midPrice) : '—'}
            </span>
          </div>
        )}

        {/* Buy imbalance - above bids */}
        {side === 'both' && (
          <div className="flex items-center px-4 py-1.5 bg-[#10b981]/5 border-y border-(--border)/30">
            <span className="text-xs font-medium text-[#10b981] mr-2">{imbalance.buy}%</span>
            <div className="flex-1 h-1.5 bg-(--surface) rounded-full overflow-hidden">
              <div className="h-full bg-[#10b981]" style={{ width: `${imbalance.buy}%` }} />
            </div>
          </div>
        )}

        {/* Bids */}
        {(side === 'bids' || side === 'both') && (
          <div>
            {bids.length === 0 ? (
              <div className="py-8 text-center text-xs text-(--text-dim)">{t('trade.noBids')}</div>
            ) : (
              (side === 'both' ? bids.slice(0, 8) : bids)
                .map((level, i) => <Row key={`bid-${i}`} level={level} type="bid" />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoTab({ pair }: { pair: Pair }) {
  const notAvailable = '—';
  const { copyToClipboard } = useCopyToClipboard();

  return (
    <div className="p-4 overflow-y-auto h-full">
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
            <div className="flex justify-between"><span>Decimals</span><span>{pair.baseToken.decimals ?? notAvailable}</span></div>
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
            {pair.baseToken.links?.homepage?.length > 0 && (
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
            {pair.baseToken.links?.blockchain_site?.length > 0 && (
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
            {pair.baseToken.links?.official_forum_url?.length > 0 && (
              <div className="flex justify-between gap-2">
                <span>Forum</span>
                <a href={pair.baseToken.links.official_forum_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                  Forum
                </a>
              </div>
            )}
            {pair.baseToken.links?.chat_url?.length > 0 && (
              <div className="flex justify-between gap-2">
                <span>Chat</span>
                <a href={pair.baseToken.links.chat_url[0]} target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline text-right break-all">
                  Chat
                </a>
              </div>
            )}
            {pair.baseToken.links?.announcement_url?.length > 0 && (
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
            {pair.baseToken.links?.repos_url?.github?.length > 0 && (
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
            <div className="flex justify-between"><span>Decimals</span><span>{pair.quoteToken.decimals ?? notAvailable}</span></div>
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
  );
}

// ─── Trade Tab ────────────────────────────────────────────────────
type OrderSide = 'buy' | 'sell';
type OrderType = 'limit' | 'market';
type AdvancedOption = 'none' | 'postOnly' | 'takeProfit' | 'stopLoss' | 'ladder';

function TradeTab({ pair, onOrderbookUpdate }: { pair: Pair; onOrderbookUpdate?: () => void }) {
  const { t } = useTranslation();
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [advanced, setAdvanced] = useState<AdvancedOption>('none');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [price, setPrice] = useState(formatInputNumber(pair.price));
  const [amount, setAmount] = useState('');
  const [expiration, setExpiration] = useState('20');
  const [expirationType, setExpirationType] = useState<'minutes' | 'days'>('minutes');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const network = (pair.network as 'bsc' | 'base' | 'solana') || 'bsc';
  useFillNotifications(network);

  // Use Dynamic wallet address if available, otherwise use store wallet address
  // Prefer the Dynamic wallet address; fall back to the first verified credential if available.
  const walletAddress = primaryWallet?.address || storeWalletAddress || user?.verifiedCredentials?.[0]?.address;
  const { sendDeposit } = useSolanaDeposit(primaryWallet, walletAddress);

  const isConnected = !!(isAuthenticated || user?.verifiedCredentials?.length || storeConnected);

  // Fetch balances regardless of the isConnected flag to allow quick‑fill
  // percentages to work when a wallet address is available but the UI
  // still shows the "Connect Wallet" state (e.g. when using MetaMask
  // without Dynamic authentication).
  const { baseBalance, quoteBalance, loading: balancesLoading, error: balancesError } = useBalances(
    pair.baseToken.address,
    pair.quoteToken.address,
    walletAddress || undefined,
    network,
    pair.baseToken.decimals || 18,
    pair.quoteToken.decimals || 18
  );

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

  const handlePct = useCallback(
    (pct: number) => {
      const balance = effectiveSide === 'buy'
        ? parseFloat(quoteBalance?.formatted || '0')
        : parseFloat(baseBalance?.formatted || '0');
      const p = parseFloat(price || String(pair.price));
      if (effectiveSide === 'buy' && p > 0) {
        setAmount(((balance * pct) / p).toFixed(6));
      } else {
        setAmount((balance * pct).toFixed(6));
      }
    },
    [effectiveSide, quoteBalance, baseBalance, price, pair.price],
  );

  const handleSubmit = async () => {
    if (!isConnected) {
      return;
    }

    // Validation for TP/SL - require trigger price
    if ((advanced === 'takeProfit' || advanced === 'stopLoss') && !triggerPrice) {
      setErrorMsg(t('trade.enterTriggerPrice'));
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
      return;
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
        title: t('trade.orderCreatedSuccessTitle'),
        description: t('trade.orderCreatedSuccessDescription'),
        variant: 'success',
      });
    } catch (err: any) {
      console.error('❌ [MobileTradingPage] createOrder hook error:', err);
      setErrorMsg(t('trade.orderFailed'));
    }
  };

  const isBuy = effectiveSide === 'buy';

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      {/* Buy / Sell toggle */}
      <div className="flex gap-1 p-1 bg-(--surface-elevated) rounded-xl border border-(--border)">
        {(['buy', 'sell'] as OrderSide[]).map(s => (
          <button
            key={s}
            onClick={() => { if (advanced !== 'ladder') setSide(s); }}
            disabled={advanced === 'ladder'}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${side === s
                ? s === 'buy'
                  ? 'bg-[#10b981] text-white shadow-sm shadow-[#10b981]/20'
                  : 'bg-[#ef4444] text-white shadow-sm shadow-[#ef4444]/20'
                : advanced === 'ladder'
                  ? 'text-(--text-dim) cursor-not-allowed opacity-50'
                  : 'text-(--text-dim) hover:text-(--text-primary)'
              }`}
          >
            {s === 'buy' ? t('trade.buy') : t('trade.sell')} {pair.baseToken.symbol}
            {advanced === 'ladder' && s === 'sell' && ` (${t('trade.ladder')})`}
          </button>
        ))}
      </div>

      {/* Order type - show only when NOT TP/SL/Ladder */}
      {advanced !== 'takeProfit' && advanced !== 'stopLoss' && advanced !== 'ladder' ? (
        <div className="space-y-2">
          <div className="flex gap-1 p-1 bg-(--surface-elevated) rounded-lg">
            {(['limit', 'market'] as OrderType[]).map(option => (
              <button
                key={option}
                onClick={() => setOrderType(option)}
                className={`flex-1 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${orderType === option ? 'bg-[#6366f1] text-white' : 'text-(--text-dim) hover:text-(--text-primary)'
                  }`}
              >
                {option === 'limit' ? t('trade.limit') : t('trade.market')}
              </button>
            ))}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${advanced !== 'none' ? 'bg-[#6366f1] text-white' : 'text-(--text-dim) hover:text-(--text-primary)'
                }`}
            >
              {advanced === 'none' ? '▲' : advanced === 'takeProfit' ? 'TP' : advanced === 'stopLoss' ? 'SL' : advanced === 'ladder' ? 'LD' : '▲'}
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
            {advanced === 'takeProfit' ? t('trade.takeProfit') : advanced === 'stopLoss' ? t('trade.stopLoss') : t('trade.ladder')}
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-2 py-1 rounded-md text-xs font-semibold text-(--text-dim)"
          >
            {showAdvanced ? t('trade.collapse') : t('trade.expand')}
          </button>
        </div>
      )}

      {/* Advanced dropdown - shows only when showAdvanced is true */}
      {showAdvanced && (
        <div className="flex gap-1 p-1 bg-(--surface-elevated) rounded-lg">
          {[
            { id: 'none' as AdvancedOption, label: t('trade.none') },
            { id: 'takeProfit' as AdvancedOption, label: t('trade.tp') },
            { id: 'stopLoss' as AdvancedOption, label: t('trade.sl') },
            { id: 'ladder' as AdvancedOption, label: t('trade.ld') },
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


      {/* Trigger Price for TP/SL */}
      {(advanced === 'takeProfit' || advanced === 'stopLoss') && (
        <Input
          label={t('trade.triggerPrice')}
          placeholder={t('trade.triggerPricePlaceholder')}
          value={triggerPrice}
          onChange={e => setTriggerPrice(e.target.value)}
          type="number"
        />
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
                    text-(--text-primary) text-sm font-mono placeholder-(--text-dim)
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
                      text-(--text-primary) text-sm font-mono placeholder-(--text-dim)
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
                      text-(--text-primary) text-sm font-mono placeholder-(--text-dim)
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
                {t('trade.ordersDistributed', { count: ladderLevels || 5 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available */}
      <div className="flex items-center justify-between text-xs px-1">
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

      {/* Price (limit only) */}
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

      {/* Expiration with minutes/days toggle */}
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
              {t('trade.expirationMin')}
            </button>
            <button
              type="button"
              onClick={() => setExpirationType('days')}
              className={`px-2 py-1 text-xs rounded ${expirationType === 'days' ? 'bg-[#6366f1] text-white' : 'text-(--text-dim)'}`}
            >
              {t('trade.expirationDays')}
            </button>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isConnected && (!amount || loading)}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background:
            !isConnected
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : isConnected && amount
                ? isBuy
                  ? 'linear-gradient(135deg, #10b981, #34d399)'
                  : 'linear-gradient(135deg, #ef4444, #f87171)'
                : 'var(--surface-elevated)',
          color: isConnected && !amount ? 'var(--text-dim)' : 'white',
          boxShadow:
            isConnected && amount
              ? `0 4px 20px ${isBuy ? '#10b98140' : '#ef444440'}`
              : undefined,
        }}
      >
        {loading
          ? t('trade.placingOrder')
          : !isConnected
            ? t('trade.connectWallet')
            : !amount
              ? t('trade.enterAmount', { token: pair.baseToken.symbol })
              : `${isBuy ? t('trade.buy') : t('trade.sell')} ${pair.baseToken.symbol}`}
      </button>

      {/* Error message */}
      {errorMsg && (
        <div className="text-xs text-[#ef4444] text-center py-2">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────
function HistoryTab({ trades, pair }: { trades: RecentTrade[]; pair?: Pair }) {
  const { t } = useTranslation();
  const { pairs } = useStore();

  // Get the pair info for decimals - same pattern as desktop
  const currentPair = pairs.find(p => p.id === pair?.id) || pair;
  const baseDecimals = getTokenDecimals(currentPair?.baseToken);
  const [tradeBaseDecimals, setTradeBaseDecimals] = useState<number>(baseDecimals);

  useEffect(() => {
    if (!currentPair) return;
    const tokenAddress = currentPair.baseToken?.address || pair?.baseToken?.address;
    const network = pair?.network || currentPair.network;
    if (!tokenAddress || !network) return;

    let canceled = false;
    console.debug('[MobileHistory] fetching base token decimals', tokenAddress, network);

    fetchTokenDecimals(tokenAddress, network as 'bsc' | 'base' | 'solana')
      .then((decimals) => {
        if (!canceled) {
          console.debug('[MobileHistory] resolved base token decimals', tokenAddress, decimals);
          setTradeBaseDecimals(decimals);
        }
      })
      .catch((error) => {
        console.error('[MobileHistory] error fetching base token decimals', tokenAddress, network, error);
      });

    return () => { canceled = true; };
  }, [currentPair?.baseToken?.address, currentPair?.network, pair?.baseToken?.address, pair?.network]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-3 px-4 py-2 border-b border-(--border)/50 flex-shrink-0">
        {['priceHeader', 'amountHeader', 'timeHeader'].map((h, i) => (
          <span key={h} className={`text-[10px] font-semibold text-(--text-dim) uppercase ${i > 0 ? 'text-right' : ''}`}>{t(`trade.${h}`)}</span>
        ))}
      </div>
      <div className="overflow-y-auto flex-1">
        {trades.map(trade => {
          const explorerHash = trade.tx_hash || trade.tx_hash_buy || trade.tx_hash_sell;
          const explorerUrl = explorerHash && pair ? getExplorerUrl(explorerHash, pair.network) : null;
          const humanAmount = fromWei(String(trade.amount), tradeBaseDecimals);
          console.debug('[MobileHistory] trade render', { id: trade.id, rawAmount: trade.amount, tradeBaseDecimals, humanAmount });
          return (
            <a
              key={trade.id}
              href={explorerUrl || '#'}
              target={explorerUrl ? '_blank' : undefined}
              rel={explorerUrl ? 'noopener noreferrer' : undefined}
              className={`grid grid-cols-3 px-4 py-2 border-b border-(--border)/30 text-xs transition-colors ${explorerUrl ? 'hover:bg-(--surface-elevated) cursor-pointer' : ''}`}
            >
              <span className={`font-medium ${trade.side === 'buy' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {formatPrice(trade.price)}
              </span>
              <span className="text-(--text-secondary) text-right">{parseFloat(humanAmount).toFixed(4)}</span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-(--text-dim) text-right">
                  {new Date(trade.time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </span>
                {explorerUrl && (
                  <ExternalLink size={12} className="text-(--text-dim) opacity-0 hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
interface MobileTradingPageProps {
  pair: Pair;
}

export function MobileTradingPage({ pair }: MobileTradingPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('chart');
  const isConnected = useStore(s => s.isConnected);
  const { theme, toggleTheme } = useStore();

  const { orderbook, refetch, aggressiveRefetch } = useOrderbook(pair.id);
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

  const isPos = pair.priceChange24h >= 0;
  const derivedVolume24hUSD = pair.volume24hUSD != null
    ? pair.volume24hUSD
    : calculateQuoteTokenUSDValue(pair.volume24h, pair.price, pair.priceUSD);
  const derivedLiquidityUSD = pair.liquidityUSD != null
    ? pair.liquidityUSD
    : pair.liquidity * pair.priceUSD;

  useEffect(() => {
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

  const trades = recentTrades;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'chart', label: t('trade.tab.chart') },
    { id: 'book', label: t('trade.tab.book') },
    { id: 'info', label: t('trade.tab.info') },
    { id: 'trade', label: t('trade.tab.trade') },
    { id: 'history', label: t('trade.tab.history') },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-(--background)">
      {/* ── Ticker bar ───────────────────────────────────────────── */}
      <div className="bg-(--surface) border-b border-(--border) px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back */}
          <button
            onClick={() => navigate('/trade')}
            className="p-1.5 rounded-lg hover:bg-(--surface-elevated) text-(--text-secondary) transition-colors flex-shrink-0"
            aria-label={t('trade.backToMarkets')}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Token icons */}
          <div className="flex -space-x-1.5 flex-shrink-0">
            <TokenAvatar symbol={pair.baseToken.symbol} logo={pair.baseToken.logo} size={26} />
            <TokenAvatar symbol={pair.quoteToken.symbol} logo={pair.quoteToken.logo} size={20} />
          </div>

          {/* Pair name + dex */}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-(--text-primary) text-sm leading-none">
              {pair.baseToken.symbol}
              <span className="text-(--text-dim) font-normal">/{pair.quoteToken.symbol}</span>
            </h2>
            <span className="text-[11px] text-(--text-dim)">{pair.dexName}</span>
          </div>


        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-2.5 overflow-x-auto scrollbar-hide">
          {[
            { label: t('trade.volume24h'), value: formatNumber(pair.volume24h), usdValue: derivedVolume24hUSD != null ? formatUSD(derivedVolume24hUSD) : undefined },
            { label: t('trade.liquidity'), value: formatNumber(pair.liquidity), usdValue: derivedLiquidityUSD != null ? formatUSD(derivedLiquidityUSD) : undefined },
            { label: t('trade.spread'), value: formatPrice(displayOrderbook.spread) },
            { label: t('trade.price'), value: formatPrice(pair.price), usdValue: pair.priceUSD ? formatUSD(pair.priceUSD) : undefined, color: isPos ? '#10b981' : '#ef4444' },
            { label: t('trade.change24h'), value: formatPercent(pair.priceChange24h), color: isPos ? '#10b981' : '#ef4444' },
          ].map(({ label, value, usdValue, color }) => (
            <div key={label} className="flex-shrink-0">
              <p className="text-[10px] text-(--text-dim) leading-none mb-0.5">{label}</p>
              <p className="text-xs font-medium" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
              {usdValue != null && <p className="text-[9px] text-(--text-dim)">{usdValue}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className="flex border-b border-(--border) bg-(--surface) flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeTab === t.id
                ? 'text-[#6366f1] border-b-2 border-[#6366f1]'
                : 'text-(--text-dim) hover:text-(--text-primary)'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden bg-(--surface)">
        {activeTab === 'chart' && (
          <div className="h-full min-h-0">
            <CandlestickChart
              pair={pair.id}
              quoteTokenSymbol={pair.quoteToken.symbol}
              quoteTokenAddress={pair.quoteToken.address}
              poolAddress={pair.pairAddress}
              network={pair.network as 'bsc' | 'base' | 'solana' | 'arbitrum' | 'avalanche' | 'polygon' | 'ethereum' || 'bsc'}
            />
          </div>
        )}
        {activeTab === 'book' && <OrderbookTab orderbook={displayOrderbook} />}
        {activeTab === 'info' && <InfoTab pair={pair} />}
        {activeTab === 'trade' && <TradeTab pair={pair} onOrderbookUpdate={aggressiveRefetch} />}
        {activeTab === 'history' && <HistoryTab trades={trades} pair={pair} />}
      </div>
    </div>
  );
}