import { useCallback, useState } from 'react';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import { getRpcUrl, getSolanaCustodyAddress, getSolanaDepositMemo } from '../utils/contracts';
import { fetchTokenDecimals, toWei } from '../utils/amount';

interface SolanaDepositResult {
  success: boolean;
  txId?: string;
  memo?: string;
  error?: string;
}

function getAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

export function useSolanaDeposit(primaryWallet: any, walletAddress: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const depositAddress = getSolanaCustodyAddress();

  const sendDeposit = useCallback(async (
    amount: string,
    depositType: 'sol' | 'spl',
    tokenMint?: string,
    memo?: string,
  ): Promise<SolanaDepositResult> => {
    setError(null);
    setTxId(null);
    setLoading(true);

    try {
      if (!primaryWallet) {
        throw new Error('Solana wallet not connected');
      }

      const signerAddress = walletAddress || primaryWallet.address || primaryWallet.publicKey?.toString();
      if (!signerAddress) {
        throw new Error('Failed to determine Solana wallet address');
      }

      const amountNumber = parseFloat(amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Enter a valid deposit amount');
      }

      const fromPublicKey = new PublicKey(signerAddress);
      const toPublicKey = new PublicKey(depositAddress);
      const connection = new Connection(getRpcUrl('solana'), 'confirmed');

      // Check SOL balance upfront — avoids sending a tx that will fail on-chain
      const solBalance = await connection.getBalance(fromPublicKey, 'confirmed');
      if (solBalance === 0) {
        throw new Error('Insufficient SOL balance to cover transaction fees');
      }

      const latest = await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        recentBlockhash: latest.blockhash,
        feePayer: fromPublicKey,
      });

      if (depositType === 'sol') {
        const lamports = Math.round(amountNumber * 1_000_000_000);
        if (lamports <= 0) {
          throw new Error('Enter a larger SOL amount');
        }

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: fromPublicKey,
            toPubkey: toPublicKey,
            lamports,
          }),
        );
      } else {
        if (!tokenMint) {
          throw new Error('Enter a valid token mint address');
        }

        const mintPublicKey = new PublicKey(tokenMint);
        const decimals = await fetchTokenDecimals(tokenMint, 'solana');
        const rawAmount = BigInt(toWei(amount, decimals));
        if (rawAmount <= 0n) {
          throw new Error('Enter a larger token amount');
        }

        const fromTokenAccount = getAssociatedTokenAddress(fromPublicKey, mintPublicKey);
        const toTokenAccount = getAssociatedTokenAddress(toPublicKey, mintPublicKey);

        const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
        if (!toAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              fromPublicKey,
              toTokenAccount,
              toPublicKey,
              mintPublicKey,
            ),
          );
        }

        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromPublicKey,
            rawAmount,
            [],
            TOKEN_PROGRAM_ID,
          ),
        );
      }

      const depositMemo = memo || (walletAddress ? getSolanaDepositMemo(walletAddress) : undefined);
      if (!depositMemo) {
        throw new Error('Failed to generate deposit memo');
      }

      transaction.add(
        new TransactionInstruction({
          keys: [],
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
          data: new TextEncoder().encode(depositMemo),
        }),
      );

      // Simulate before signing — surfaces on-chain errors (bad ATA, insufficient funds)
      // without spending fees or requiring a wallet prompt
      const simulation = await connection.simulateTransaction(transaction);
      if (simulation.value.err) {
        const simLogs = simulation.value.logs?.join('\n') || '';
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}\n${simLogs}`);
      }

      const resolveSolanaSigner = async (wallet: any): Promise<any> => {
        let client = wallet;

        if (wallet?.getWalletClient && typeof wallet.getWalletClient === 'function') {
          try {
            client = await wallet.getWalletClient();
          } catch (err) {
            client = wallet;
          }
        }

        const candidates = [client, wallet];

        for (const candidate of candidates) {
          if (!candidate) continue;

          if (typeof candidate.getSigner === 'function') {
            const signer = await candidate.getSigner();
            if (signer) return signer;
          }

          if (
            typeof candidate.signAndSendTransaction === 'function' ||
            typeof candidate.signTransaction === 'function' ||
            typeof candidate.signAllTransactions === 'function' ||
            typeof candidate.sendTransaction === 'function'
          ) {
            return candidate;
          }
        }

        return null;
      };

      const signer = await resolveSolanaSigner(primaryWallet);
      if (!signer) {
        throw new Error('Solana wallet does not support transaction signing');
      }

      let signature: string;
      if (typeof signer.signAndSendTransaction === 'function') {
        const result = await signer.signAndSendTransaction(transaction);
        signature = typeof result === 'string' ? result : result.signature;
      } else if (typeof signer.signTransaction === 'function') {
        const signedTx = await signer.signTransaction(transaction);
        const rawTx = signedTx.serialize();
        signature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'confirmed',
        });
      } else if (typeof signer.signAllTransactions === 'function') {
        const [signedTx] = await signer.signAllTransactions([transaction]);
        const rawTx = signedTx.serialize();
        signature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'confirmed',
        });
      } else if (typeof signer.sendTransaction === 'function') {
        signature = await signer.sendTransaction(transaction, connection);
      } else {
        throw new Error('Solana wallet does not support transaction signing');
      }

      await connection.confirmTransaction({
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }, 'confirmed');

      setTxId(signature);
      setLoading(false);
      return { success: true, txId: signature, memo: depositMemo };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send deposit';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  }, [depositAddress, primaryWallet, walletAddress]);

  return {
    depositAddress,
    depositLoading: loading,
    depositError: error,
    depositTxId: txId,
    sendDeposit,
  };
}
