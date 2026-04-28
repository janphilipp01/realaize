import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { AiChatBody, AiChatResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const RATE_LIMIT_WINDOWS = [
  { name: "minute", windowMs: 60_000, max: 20 },
  { name: "hour", windowMs: 60 * 60_000, max: 200 },
] as const;

type Hits = { startedAt: number; count: number }[];
const hitsByIp = new Map<string, Hits>();

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0]?.trim();
  return first || req.ip || req.socket.remoteAddress || "unknown";
}

function checkRateLimit(ip: string): { allowed: true } | { allowed: false; window: string; retryAfterSec: number } {
  const now = Date.now();
  let entry = hitsByIp.get(ip);
  if (!entry) {
    entry = RATE_LIMIT_WINDOWS.map(() => ({ startedAt: now, count: 0 }));
    hitsByIp.set(ip, entry);
  }
  for (let i = 0; i < RATE_LIMIT_WINDOWS.length; i++) {
    const w = RATE_LIMIT_WINDOWS[i]!;
    const slot = entry[i]!;
    if (now - slot.startedAt >= w.windowMs) {
      slot.startedAt = now;
      slot.count = 0;
    }
    if (slot.count >= w.max) {
      return {
        allowed: false,
        window: w.name,
        retryAfterSec: Math.ceil((w.windowMs - (now - slot.startedAt)) / 1000),
      };
    }
  }
  for (const slot of entry) slot.count += 1;
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  const longest = RATE_LIMIT_WINDOWS[RATE_LIMIT_WINDOWS.length - 1]!.windowMs;
  for (const [ip, entry] of hitsByIp) {
    if (entry.every((s) => now - s.startedAt >= longest)) hitsByIp.delete(ip);
  }
}, 5 * 60_000).unref?.();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const result = checkRateLimit(ip);
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSec));
    logger.warn(
      { ip, window: result.window, retryAfterSec: result.retryAfterSec },
      "ai_chat rate limit exceeded",
    );
    return res.status(429).json({
      error: `Rate limit exceeded for this IP (per ${result.window}). Try again in ${result.retryAfterSec}s.`,
    });
  }
  return next();
}

router.post("/ai/chat", rateLimit, async (req, res) => {
  const ip = getClientIp(req);
  const startedAt = Date.now();

  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    logger.info({ ip, status: 400 }, "ai_chat invalid body");
    return res.status(400).json({
      error: `Invalid request body: ${parsed.error.message}`,
    });
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    logger.warn({ ip }, "ai_chat called without ANTHROPIC_API_KEY configured");
    return res.status(500).json({
      error:
        "ANTHROPIC_API_KEY is not configured on the server. Add it as a Replit Secret to enable the AI copilot.",
    });
  }

  const { system, messages, maxTokens, model, webSearch } = parsed.data;
  const usedModel = model ?? DEFAULT_MODEL;

  logger.info(
    {
      ip,
      model: usedModel,
      messageCount: messages.length,
      maxTokens,
      webSearch: !!webSearch,
      hasSystem: !!system,
    },
    "ai_chat request",
  );

  try {
    const client = new Anthropic({ apiKey });
    const completion = await client.messages.create({
      model: usedModel,
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(webSearch
        ? {
            tools: [
              {
                type: "web_search_20250305",
                name: "web_search",
                max_uses: 1,
              } as unknown as Anthropic.Messages.ToolUnion,
            ],
          }
        : {}),
    });

    const text = completion.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const payload = AiChatResponse.parse({
      text,
      model: completion.model,
      stopReason: completion.stop_reason,
    });

    logger.info(
      {
        ip,
        model: completion.model,
        stopReason: completion.stop_reason,
        inputTokens: completion.usage?.input_tokens,
        outputTokens: completion.usage?.output_tokens,
        latencyMs: Date.now() - startedAt,
      },
      "ai_chat success",
    );

    return res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      { ip, model: usedModel, latencyMs: Date.now() - startedAt, err: message },
      "ai_chat upstream error",
    );
    return res.status(502).json({ error: `Upstream LLM error: ${message}` });
  }
});

export default router;
