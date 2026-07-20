export function formatNumber(num: number): string {
  if (!isFinite(num) || num === 0) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  if (num >= 1)   return num.toFixed(2);
  if (num >= 0.001)  return num.toFixed(4);
  if (num >= 0.000001) return num.toFixed(6);
  return num.toFixed(8);
}

export function formatPlainNumber(num: number): string {
  if (!isFinite(num) || num === 0) return '0';
  // Large numbers: abbreviate with K/M/B
  if (num >= 1e9) return (num / 1e9).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'B';
  if (num >= 1e6) return (num / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M';
  if (num >= 1e3) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Normal range: 2 decimal places
  if (num >= 1)   return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Small numbers: show enough significant digits so they don't round to 0.00
  if (num >= 0.01)     return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (num >= 0.001)    return num.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  if (num >= 0.0001)   return num.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  if (num >= 0.00001)  return num.toLocaleString('en-US', { minimumFractionDigits: 7, maximumFractionDigits: 7 });
  if (num >= 0.000001) return num.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  return num.toLocaleString('en-US', { minimumFractionDigits: 10, maximumFractionDigits: 10 });
}

// Format order value with support for small amounts (won't truncate to 0.00)
export function formatOrderValue(num: number): string {
  if (!isFinite(num) || num === 0) return '0';
  // Large numbers: use commas
  if (num >= 1e6) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1e3) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Normal range: 2-4 decimal places
  if (num >= 1)   return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  // Small numbers: show enough decimals to be meaningful
  if (num >= 0.01)     return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (num >= 0.001)    return num.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  if (num >= 0.0001)   return num.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  if (num >= 0.00001)  return num.toLocaleString('en-US', { minimumFractionDigits: 7, maximumFractionDigits: 7 });
  if (num >= 0.000001) return num.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  return num.toLocaleString('en-US', { minimumFractionDigits: 10, maximumFractionDigits: 10 });
}

export function parseFormattedNumber(str: string | number): number {
  if (typeof str === 'number') return str;
  if (!str || str === '') return 0;

  const cleaned = str.toString().replace(/[$,]/g, '').trim();
  const match = cleaned.match(/^([\d.]+)([KMB]?)$/i);

  if (!match) return parseFloat(cleaned) || 0;

  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();

  switch (suffix) {
    case 'K': return num * 1000;
    case 'M': return num * 1000000;
    case 'B': return num * 1000000000;
    default: return num;
  }
}

export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0';
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  return num.toFixed(8);
}

export function formatInputNumber(num: number, maxDecimals: number = 18): string {
  if (!isFinite(num)) return '';
  const s = num.toFixed(maxDecimals);
  return s.replace(/\.?0+$/,'');
}

export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

export function formatUSD(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  if (num >= 1) return `$${num.toFixed(2)}`;
  if (num >= 0.01) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(6)}`;
}

export function calculateQuoteTokenUSD(price: number, priceUSD?: number): number | undefined {
  if (priceUSD == null || price <= 0) return undefined;
  return priceUSD / price;
}

export function calculateQuoteTokenUSDValue(amount: number, price: number, priceUSD?: number): number | undefined {
  const quoteTokenUSD = calculateQuoteTokenUSD(price, priceUSD);
  if (quoteTokenUSD == null) return undefined;
  return amount * quoteTokenUSD;
}

export function deriveStableMarketCapUSD(marketCap: number | undefined, baseSymbol: string, quoteSymbol: string): number | undefined {
  if (marketCap == null || marketCap <= 0) return undefined;
  const stableSymbols = ['USDT', 'USDC'];
  if (stableSymbols.includes(quoteSymbol) || stableSymbols.includes(baseSymbol)) {
    return marketCap;
  }
  return undefined;
}

export function formatPriceWithUSD(price: number, usdPrice?: number): string {
  const formattedPrice = formatPrice(price);
  if (usdPrice !== undefined && usdPrice > 0) {
    return `${formattedPrice} ($${usdPrice.toFixed(2)})`;
  }
  return formattedPrice;
}

export function shortenAddress(address: string): string {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatAmountFromWei(
  amountWei: string | number,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const amountStr = typeof amountWei === 'number' ? amountWei.toString() : amountWei;
  if (!amountStr || amountStr === '0' || amountStr === '') return '0';
  
  const padded = amountStr.padStart(decimals + 1, '0');
  
  const integerPart = padded.slice(0, -decimals) || '0';
  const decimalPart = padded.slice(-decimals);
  
  const trimmedDecimal = decimalPart.slice(0, displayDecimals).replace(/0+$/, '');
  
  if (trimmedDecimal) {
    return `${integerPart}.${trimmedDecimal}`;
  }
  
  return integerPart;
}

export function calculateMidPrice(bestBid: number, bestAsk: number): number {
  if (bestBid <= 0 || bestAsk <= 0) return 0;
  return (bestBid + bestAsk) / 2;
}

export function calculateSpread(bestBid: number, bestAsk: number): number {
  if (bestBid <= 0 || bestAsk <= 0) return 0;
  return bestAsk - bestBid;
}

export function calculateSpreadPercent(bestBid: number, bestAsk: number): number {
  const midPrice = calculateMidPrice(bestBid, bestAsk);
  if (midPrice <= 0) return 0;
  const spread = calculateSpread(bestBid, bestAsk);
  return (spread / midPrice) * 100;
}

export function formatSpreadPercent(spreadPercent: number): string {
  if (spreadPercent <= 0) return '0.00%';
  if (spreadPercent < 0.01) return spreadPercent.toFixed(4) + '%';
  if (spreadPercent < 0.1) return spreadPercent.toFixed(3) + '%';
  if (spreadPercent < 1) return spreadPercent.toFixed(2) + '%';
  return spreadPercent.toFixed(2) + '%';
}