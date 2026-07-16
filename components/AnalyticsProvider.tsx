"use client";

// Registers the PostHog sink with the shared analytics façade once on mount,
// and captures a $pageview on every App Router route change (Next client
// navigations don't fire a full page load). Renders nothing. No-ops entirely
// when no PostHog key is configured.
//
// Mirrors bia-admin/components/AnalyticsProvider.tsx so both apps feed the
// same PostHog project with the same event taxonomy.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setAnalyticsSink } from "@biboyang425/bia-shared/analytics";
import {
  POSTHOG_ENABLED,
  capturePageview,
  createPostHogSink,
} from "@/lib/analytics/posthog-sink";

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const sink = createPostHogSink();
    if (sink) setAnalyticsSink(sink);
  }, []);

  useEffect(() => {
    if (POSTHOG_ENABLED) capturePageview();
  }, [pathname]);

  return null;
}
