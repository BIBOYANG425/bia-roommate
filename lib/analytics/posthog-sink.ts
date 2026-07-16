// PostHog-backed AnalyticsSink for uscbia.com. Mirrors the bia-admin pattern:
// returns null (→ the shared analytics façade stays a no-op) when
// NEXT_PUBLIC_POSTHOG_KEY is unset, so the site is safe to ship before a key
// exists. Explicit events only (autocapture off) so we never leak PII out of
// the DOM.

import posthog from "posthog-js";
import type { AnalyticsSink } from "@biboyang425/bia-shared/analytics";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const POSTHOG_ENABLED = Boolean(KEY);

let initialized = false;

export function createPostHogSink(): AnalyticsSink | null {
  if (!KEY) return null;
  if (!initialized) {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // captured manually on App Router route changes
      capture_pageleave: true,
      autocapture: false, // explicit, taxonomy-defined events only
    });
    initialized = true;
  }
  return {
    track: (event: string, props?: Record<string, unknown>) => {
      posthog.capture(event, props);
    },
  };
}

export function capturePageview(): void {
  if (KEY) posthog.capture("$pageview");
}
