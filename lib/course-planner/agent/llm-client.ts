/**
 * LLM client abstraction — config resolution, API calls, retry, JSON extraction.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LLMConfig, LLMResult } from "./types";

// ─── Config Resolution ───

/** Main model for recommender (reasoning + synthesis) */
export function getLLMConfig(): LLMConfig | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: "https://api.anthropic.com/v1/messages",
      model: "claude-haiku-4-5-20251001",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    };
  }
  if (process.env.NVIDIA_API_KEY) {
    return {
      provider: "nvidia",
      apiKey: process.env.NVIDIA_API_KEY,
      baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
      model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b",
    };
  }
  return null;
}

/** Fast model for interpreter (structured JSON parsing) */
export function getInterpreterConfig(): LLMConfig | null {
  if (process.env.NVIDIA_FAST_KEY) {
    return {
      provider: "nvidia",
      apiKey: process.env.NVIDIA_FAST_KEY,
      baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
      model: process.env.NVIDIA_FAST_MODEL || "google/gemma-3n-e4b-it",
    };
  }
  return getLLMConfig();
}

// ─── Core LLM Call ───

export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  config: LLMConfig,
  maxTokens: number = 500,
  timeoutMs: number = 15000,
  thinking: boolean = false,
): Promise<LLMResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let body: any;

  if (config.provider === "anthropic") {
    headers["x-api-key"] = config.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: config.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    };
  } else {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
    body = {
      model: config.model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    };
    if (config.provider === "nvidia") {
      body.chat_template_kwargs = { enable_thinking: thinking };
      if (thinking) {
        body.max_tokens = maxTokens * 3;
      }
    }
  }

  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LLM API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();

  if (config.provider === "anthropic") {
    return { content: data.content?.[0]?.text || "" };
  }
  const msg = data.choices?.[0]?.message;
  return {
    content: msg?.content || msg?.reasoning_content || "",
    reasoning: msg?.reasoning_content || undefined,
  };
}

// ─── Retry Wrapper ───

export async function callLLMWithRetry(
  systemPrompt: string,
  userMessage: string,
  config: LLMConfig,
  options?: {
    maxTokens?: number;
    timeoutMs?: number;
    thinking?: boolean;
    retries?: number;
  },
): Promise<LLMResult> {
  const retries = options?.retries ?? 1;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callLLM(
        systemPrompt,
        userMessage,
        config,
        options?.maxTokens ?? 500,
        options?.timeoutMs ?? 15000,
        options?.thinking ?? false,
      );
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// ─── JSON Extraction ───

/**
 * Extract JSON from LLM output. Handles markdown fences, surrounding text,
 * and nested brackets. Much more reliable than regex `/\{[\s\S]*\}/`.
 */
export function extractJSON(text: string, type: "object" | "array"): string {
  // Strip markdown code fences
  const cleaned = text
    .replace(/```(?:json)?\s*\n?/g, "")
    .replace(/```\s*$/g, "");

  const open = type === "array" ? "[" : "{";
  const close = type === "array" ? "]" : "}";

  const start = cleaned.indexOf(open);
  if (start === -1) {
    throw new Error(
      `No JSON ${type} found in LLM response: ${text.slice(0, 100)}...`,
    );
  }

  // Walk forward counting bracket depth to find matching close
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) {
      return cleaned.slice(start, i + 1);
    }
  }

  throw new Error(
    `Unmatched ${open} in LLM response: ${text.slice(0, 100)}...`,
  );
}
