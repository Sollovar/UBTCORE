import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const GO_BACKEND = "http://localhost:8099";
const PAIR_INDEXER = "http://localhost:3001";

const SKIP_HEADERS = new Set(["host", "connection", "transfer-encoding"]);

async function proxyTo(
  baseUrl: string,
  req: Request,
  res: Response,
  timeoutMs = 10000,
): Promise<void> {
  const target = `${baseUrl}${req.originalUrl}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!SKIP_HEADERS.has(k.toLowerCase()) && typeof v === "string") {
        headers[k] = v;
      }
    }
    const hasBody = ["POST", "PUT", "PATCH"].includes(req.method);
    const body = hasBody ? JSON.stringify(req.body) : undefined;
    if (hasBody) headers["content-type"] = "application/json";

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });

    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (!SKIP_HEADERS.has(k.toLowerCase())) res.setHeader(k, v);
    });
    res.send(await upstream.text());
  } catch (err: any) {
    if (err?.name === "AbortError") {
      logger.error({ target }, "Proxy timed out");
      res.status(504).json({ error: "Gateway timeout" });
    } else {
      logger.error({ err, target }, "Proxy failed");
      res.status(502).json({ error: "Bad gateway" });
    }
  } finally {
    clearTimeout(timer);
  }
}

// Pair Indexer handles all pair/market-data routes (fast, in-memory)
async function proxyToPairIndexer(req: Request, res: Response): Promise<void> {
  return proxyTo(PAIR_INDEXER, req, res);
}

// Go backend handles trading, auth, orders, fills, balances, websocket
async function proxyToGoBackend(req: Request, res: Response): Promise<void> {
  return proxyTo(GO_BACKEND, req, res);
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All /api/v1/* routes → Go backend
app.all("/api/v1/*path", proxyToGoBackend);
app.all("/health", proxyToGoBackend);
app.get("/ws", proxyToGoBackend);

app.use("/api", router);

export default app;
