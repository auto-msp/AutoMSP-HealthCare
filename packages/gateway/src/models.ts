import { generateText } from "ai";
import type { ModelClient } from "./types";

/** Free, zero-data-retention US models on Vercel AI Gateway, in order of preference. */
export const FREE_MODELS = ["nvidia/nemotron-3.5-lightning-free", "inclusionai/ling-3.1-flash-1019"] as const;

/**
 * Calls a model through Vercel AI Gateway. Reads AI_GATEWAY_API_KEY from the environment.
 * The free models sometimes return empty text, so an empty result is retried once.
 */
export function aiGatewayModel(id: string = FREE_MODELS[0], opts: { attempts?: number; timeoutMs?: number } = {}): ModelClient {
  const attempts = opts.attempts ?? 2;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  return {
    id,
    async generate({ system, prompt }) {
      let lastError: unknown;
      for (let i = 0; i < attempts; i++) {
        try {
          const { text } = await generateText({
            model: id,
            system,
            prompt,
            maxOutputTokens: 1200,
            abortSignal: AbortSignal.timeout(timeoutMs),
          });
          if (text.trim()) return text;
        } catch (e) {
          lastError = e;
        }
      }
      if (lastError) throw lastError;
      return "";
    },
  };
}

/**
 * Offline stand-in so the portal demo works without a key. It is scripted, not smart:
 * it summarizes by quoting the (already tokenized) prompt, and when asked to "compare"
 * it drifts to a second patient, which is exactly what the output screen must catch.
 */
export function scriptedModel(): ModelClient {
  return {
    id: "scripted-demo",
    async generate({ prompt }) {
      const firstLines = prompt.trim().split(/\n+/).slice(0, 3).join(" ").slice(0, 280);
      const drift = /\bcompare\b/i.test(prompt) ? "\n\nFor comparison, Patient A-1177 had a similar request last month." : "";
      return `Summary for review: ${firstLines}${drift}`;
    },
  };
}
