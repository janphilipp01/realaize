import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { AiChatBody, AiChatResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

router.post("/ai/chat", async (req, res) => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: `Invalid request body: ${parsed.error.message}`,
    });
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return res.status(500).json({
      error:
        "ANTHROPIC_API_KEY is not configured on the server. Add it as a Replit Secret to enable the AI copilot.",
    });
  }

  const { system, messages, maxTokens } = parsed.data;

  try {
    const client = new Anthropic({ apiKey });
    const completion = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
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

    return res.json(payload);
  } catch (err) {
    logger.error({ err }, "Anthropic call failed");
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Upstream LLM error: ${message}` });
  }
});

export default router;
