# Deploy Ladder Refund Fix - Step by Step Guide

## What Was Fixed

Two critical bugs in ladder order refunds:
1. ✅ **Parent-child tracking**: Now calculates refund across ALL ladder children
2. ✅ **Decimal units**: Removed double multiplication (was sending 1,000,000x too much)

**Result**: Refunds now send the correct amount when ladder orders partially fill and expire.

---

## Build Status

✅ **Backend compiled successfully**
- Binary: `backend/api.exe` (30.7 MB)
- Build time: 2026-07-10 16:07:30

---

## Deployment Steps

### 1. Stop the Current Backend

```bash
# Find the running backend process
ps aux | grep "api.exe"

# Kill it (use the PID from above)
kill <PID>

# Or if running in Replit/similar
# Click "Stop" button
```

### 2. Backup Current Binary (Optional but Recommended)

```bash
cd backend
cp api.exe api.exe.backup-$(date +%Y%m%d-%H%M%S)
```

### 3. Deploy New Binary

**Option A: Already built locally (Windows)**
```bash
# The binary is already at: backend/api.exe
# Just restart it
.\api.exe
```

**Option B: Rebuild on server**
```bash
cd backend
go build ./cmd/api
./api
```

### 4. Verify Backend Started

Check logs for these messages:
```
[RefundService] Started refund processing worker
Server starting on port 8080
Database connected successfully!
```

### 5. Monitor Refund Service

Watch for refund calculations when ladder orders expire:
```
[RefundService] Ladder child order 123 (parent 120): total_deposit=1050000000, total_spent=525000000, refund=525000000
[RefundService] Executing refund of 525000000 <token> (raw units) to <address>
[RefundService] Refund 45 completed successfully, tx: <txHash>
```

---

## Testing After Deployment

### Test Case: Partial Fill + Expiry

1. **Create a ladder order**:
   - Token: CATWIF (or any test token)
   - Amount: 1050 tokens
   - Levels: 2
   - Type: Sell

2. **Wait for partial fill**:
   - One child order should fill (525 tokens sold)
   - One child order should remain open

3. **Let it expire or cancel**:
   - Wait for expiry time OR manually cancel
   - Watch refund service logs

4. **Verify refund amount**:
   - Should refund exactly 525 tokens (remaining amount)
   - Check wallet to confirm correct amount received

### Expected Log Output

```
[RefundService] Ladder child order 456 (parent 455): total_deposit=1050000000, total_spent=525000000, refund=525000000
[RefundService] Creating refund for order 455: token=<tokenMint>, amount=525000000, to=<userAddress>
[RefundService] Queued refund for order 455, amount 525000000
[RefundService] Executing refund of 525000000 <tokenMint> (raw units) to <userAddress>
[RefundService] Refund 78 completed successfully, tx: <txHash>
```

---

## Rollback Plan (If Issues Occur)

If the new version causes problems:

1. **Stop the new backend**:
   ```bash
   kill <PID>
   # or click Stop button
   ```

2. **Restore backup**:
   ```bash
   cd backend
   cp api.exe.backup-YYYYMMDD-HHMMSS api.exe
   ```

3. **Restart**:
   ```bash
   ./api.exe
   ```

4. **Report issue** with logs showing the problem

---

## What to Watch For

### ✅ Good Signs
- Refund amounts match expected remaining balance
- Logs show parent-child tracking working
- Wallet receives correct token amount
- No failed transactions

### 🚨 Red Flags
- Refund amounts > original deposit
- Refund amounts in billions (e.g., 525,000,000,000 instead of 525,000,000)
- Multiple refunds for same order
- Failed transactions with "insufficient balance" errors
- Logs showing "could not determine token mint"

---

## Files Changed

- `backend/internal/services/refund.go`
  - Added parent-child ladder tracking logic
  - Removed decimal multiplication bug
  - Added comprehensive logging

- `backend/cmd/api/main.go`
  - Updated NewRefundService() call with orderRepo parameter

---

## Documentation

For full technical details, see:
- `LADDER_REFUND_COMPLETE_FIX.md` - Complete overview
- `LADDER_REFUND_CRITICAL_FIX.md` - Parent-child tracking fix
- `LADDER_REFUND_DECIMAL_FIX.md` - Decimal units fix

---

## Status

✅ **READY FOR DEPLOYMENT**

All code compiled successfully. Ready to deploy and test with real ladder orders.
