import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();
const COINSTATS_BASE = "https://openapiv1.coinstats.app";

const NETWORK_MAP: Record<string, string> = {
  bsc: "binancesmartchain",
  base: "base-wallet",
  solana: "solana",
  ethereum: "ethereum",
  arbitrum: "arbitrum-wallet",
  avalanche: "avalanche-wallet",
  polygon: "polygon-wallet",
};

function getApiKey(): string {
  const key = process.env.COINSTATS_API_KEY;
  if (!key) throw new Error("COINSTATS_API_KEY is not configured");
  return key;
}

router.patch("/portfolio/sync", async (req, res) => {
  const { address, network } = req.query as { address?: string; network?: string };

  if (!address || !network) {
    res.status(400).json({ error: "address and network are required" });
    return;
  }

  const connectionId = NETWORK_MAP[network] ?? network;

  try {
    const apiKey = getApiKey();
    const response = await fetch(
      `${COINSTATS_BASE}/wallet/transactions?address=${encodeURIComponent(address)}&connectionId=${encodeURIComponent(connectionId)}`,
      {
        method: "PATCH",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    const data = await response.json().catch(() => ({}));
    logger.info({ address, network, status: response.status }, "Portfolio sync");
    res.status(response.status).json(data);
  } catch (err) {
    logger.error({ err }, "Portfolio sync error");
    res.status(500).json({ error: "Failed to sync wallet transactions" });
  }
});

router.get("/portfolio/pl", async (req, res) => {
  const { address, network, page = "1", limit = "50" } = req.query as {
    address?: string;
    network?: string;
    page?: string;
    limit?: string;
  };

  if (!address || !network) {
    res.status(400).json({ error: "address and network are required" });
    return;
  }

  const connectionId = NETWORK_MAP[network] ?? network;

  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ address, connectionId, page, limit });
    const response = await fetch(`${COINSTATS_BASE}/wallet/pl?${params}`, {
      headers: { "X-API-KEY": apiKey },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));
    logger.info({ address, network, status: response.status }, "Portfolio PL fetch");
    res.status(response.status).json(data);
  } catch (err) {
    logger.error({ err }, "Portfolio PL error");
    res.status(500).json({ error: "Failed to fetch portfolio P&L" });
  }
});

export default router;
