# Translation Updates Implementation Guide

## Status: Translation Keys Added ✓

All required translation keys have been added to `artifacts/dex/src/i18n/i18n.ts`:

### New Translation Keys Added:
- `trade.postOnly` - "Post Only" order type
- `trade.reduceOnly` - "Reduce Only" order type  
- `trade.orderValue` - "Order Value" label
- `trade.slippage` - "Slippage" label
- `trade.chart` - "Chart" tab
- `trade.orderBook` - "Order Book" tab
- `trade.trades` - "Trades" tab
- `trade.info` - "Info" tab
- `trade.more` - "More" nav button

## Components That Need Updates

### Mobile UI

#### 1. Mobile Trade Page (`artifacts/dex/src/mobile/MobileTradePage.tsx`)
**Status**: ✓ useTranslation hook imported
**Needed**:
- Add `const { t } = useTranslation();` in MobileTradePageInner function
- Update nav buttons: Chart, Order Book, Trades

```typescript
// Line ~332 - Update tab buttons
{(["Chart", "Order Book", "Trades"] as MainTab[]).map((tab) => {
  const key = tab === "Chart" ? "chart" : tab === "Order Book" ? "orderBook" : "trades";
  return (
    <button key={tab} onClick={() => setMainTab(tab)}>
      {t(`trade.${key}`)}
    </button>
  );
})}
```

#### 2. Mobile Trade View (`artifacts/dex/src/mobile/components/MobileTradeView.tsx`)
**Status**: ✓ useTranslation hook already imported  
**Needed**:
- Line ~XXX: Update "Post Only" → `{t('trade.postOnly')}`
- Line ~XXX: Update "Reduce Only" → `{t('trade.reduceOnly')}`
- Line ~XXX: Update "Order Value" → `{t('trade.orderValue')}`
- Line ~XXX: Update "Slippage" → `{t('trade.slippage')}`

### Desktop UI

#### 3. Desktop Top Nav (`artifacts/dex/src/desktop/components/TopNav.tsx`)
**Status**: ✓ useTranslation hook already imported
**Needed**:
- Line ~148: Update "Trade" → `{t('nav.trade')}`
- Line ~159: Update "More" → `{t('trade.more')}`
- Line ~113-119: Update "Docs" and "API" in MoreDropdown to use translations

```typescript
// Update MoreDropdown content
<a href="#">{t('menu.docs')}</a>
<a href="#">{t('menu.api')}</a>  // Need to add menu.api key
```

#### 4. Desktop Order Book (`artifacts/dex/src/desktop/components/OrderBook.tsx`)
**Status**: Needs useTranslation import
**Needed**:
- Import `useTranslation` hook
- Add `const { t } = useTranslation();`
- Line ~XXX: Update "Order Book" tab → `{t('trade.orderBook')}`
- Line ~XXX: Update "Trades" tab → `{t('trade.trades')}`
- Update column headers to use translations

#### 5. Desktop Bottom Panel (Open Orders, Order History, Trade History)
**File**: Find the bottom panel component
**Needed**:
- Update "Open Orders" → `{t('orders.tab.open')}`
- Update "Order History" → `{t('orders.tab.history')}`
- Update "Trade History" → `{t('orders.tab.tradeHistory')}`

#### 6. Desktop Order Entry Panel
**File**: Find order entry/trade panel component
**Needed**:
- Update "Post Only" → `{t('trade.postOnly')}`
- Update "Reduce Only" → `{t('trade.reduceOnly')}`
- Update "Order Value" → `{t('trade.orderValue')}`
- Update "Slippage" → `{t('trade.slippage')}`
- Update all order form labels

## Additional Translation Keys To Add

Need to add to `i18n.ts`:
```typescript
'menu.api': {
  en: 'API', zh: 'API', es: 'API', ru: 'API', pt: 'API', ar: 'API', tr: 'API', ko: 'API',
},
```

## Implementation Priority

1. ✓ Add all translation keys to i18n.ts
2. **HIGH**: Mobile Trade Page nav buttons (Chart, Order Book, Trades)
3. **HIGH**: Mobile Trade Panel (Post Only, Reduce Only, Order Value, Slippage)  
4. **MEDIUM**: Desktop Top Nav (Trade, More, Docs, API)
5. **MEDIUM**: Desktop Order Book tabs and headers
6. **MEDIUM**: Desktop Bottom Panel tabs
7. **LOW**: Desktop Order Entry Panel

## Testing Checklist

After implementation:
- [ ] Switch languages and verify all updated text changes
- [ ] Mobile: Chart/Order Book/Trades tabs translate correctly
- [ ] Mobile: Trade panel options (Post Only, Reduce Only) translate
- [ ] Desktop: Nav buttons (Trade, More) translate
- [ ] Desktop: Order Book tabs translate
- [ ] Desktop: Bottom panel tabs translate
- [ ] No console errors about missing translation keys
- [ ] All 8 languages display correctly

## Notes

- The `useTranslation` hook provides `t()` function for translation
- Translation key format: `'category.subcategory'` (e.g., `'trade.postOnly'`)
- For dynamic keys, use template literals: `t(\`trade.\${keyName}\`)`
- Fallback to English if key not found
- All translation values must be provided for all 8 languages: en, zh, es, ru, pt, ar, tr, ko
