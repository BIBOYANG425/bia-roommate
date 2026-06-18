// Calls the web app's /api/schedules with the user's Supabase bearer token.
// Throws "AUTH_REQUIRED" on a 401 so the worker can prompt re-login.
//
// Header last reviewed: 2026-06-17

import { BIA_API_BASE } from "../shared/constants";
import type { SavedScheduleSummary } from "../shared/types";

export async function saveSchedule(
  token: string,
  body: { name?: string; semester: string; courses: string[]; schedule_data: Record<string, unknown> },
): Promise<{ id: string }> {
  const res = await fetch(`${BIA_API_BASE}/api/schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) throw new Error("AUTH_REQUIRED");
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  const data = await res.json();
  return { id: String(data.id) };
}

export async function listSchedules(token: string): Promise<SavedScheduleSummary[]> {
  const res = await fetch(`${BIA_API_BASE}/api/schedules`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) throw new Error("AUTH_REQUIRED");
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as SavedScheduleSummary[];
}
