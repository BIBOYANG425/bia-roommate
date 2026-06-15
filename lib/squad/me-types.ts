// lib/squad/me-types.ts
// Shared shapes for the /squad 我的 hub + account settings. Mirror the bia-admin
// Phase 3 RPC return columns (migration 20260615120000).
export interface PingRow {
  ping_id: string; post_id: string; category: string; content: string;
  location: string | null; poster_name: string; current_people: number;
  max_people: number; status: string; score: number;
  response: "joined" | "declined" | null; responded_at: string | null;
  created_at: string; matched_tags: string[]; best_facet: string | null;
}
export interface MyPostRow {
  post_id: string; category: string; content: string; location: string | null;
  status: string; current_people: number; max_people: number;
  created_at: string; reach_count: number;
}
export interface MyJoinedRow {
  post_id: string; category: string; content: string; location: string | null;
  status: string; current_people: number; max_people: number; created_at: string;
}
export interface MatchPrefs {
  student_id: string; pings_enabled: boolean; allowed_categories: string[] | null;
  weekly_ping_cap: number; quiet_start_hour: number; quiet_end_hour: number;
  channel: string; updated_at: string;
}
export interface SignalFacet { label: string; source: string; updated_at: string; }
export interface MySignals { interest_tags: string[]; facets: SignalFacet[]; }
