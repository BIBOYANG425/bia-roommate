// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SquadSettingsSection from "../SquadSettingsSection";
import type { MatchPrefs, MySignals } from "@/lib/squad/me-types";

afterEach(cleanup);

const prefs: MatchPrefs = {
  student_id: "s1", pings_enabled: false, allowed_categories: null, weekly_ping_cap: 3,
  quiet_start_hour: 23, quiet_end_hour: 9, channel: "imessage", updated_at: "",
};
const signals: MySignals = { interest_tags: ["korean_food"], facets: [{ label: "korean_food", source: "profile", updated_at: "" }] };

describe("SquadSettingsSection", () => {
  it("renders the pings toggle OFF by default and the existing interest tag", () => {
    render(<SquadSettingsSection initialPrefs={prefs} initialSignals={signals} />);
    expect((screen.getByLabelText(/接收 pings/i) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/korean food/)).toBeTruthy();
  });

  it("PUTs prefs when the toggle flips on", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ...prefs, pings_enabled: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SquadSettingsSection initialPrefs={prefs} initialSignals={signals} />);
    fireEvent.click(screen.getByLabelText(/接收 pings/i));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/squad/prefs", expect.objectContaining({ method: "PUT" })));
    vi.unstubAllGlobals();
  });

  it("POSTs a new interest tag on add", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, embedded: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SquadSettingsSection initialPrefs={prefs} initialSignals={signals} />);
    fireEvent.change(screen.getByPlaceholderText(/加兴趣/), { target: { value: "bouldering" } });
    fireEvent.click(screen.getByText("添加"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/squad/signals", expect.objectContaining({ method: "POST" })));
    vi.unstubAllGlobals();
  });
});
