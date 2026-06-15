import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import PingInbox from "../PingInbox";
import type { PingRow } from "@/lib/squad/me-types";

afterEach(cleanup);

const ping = (over: Partial<PingRow> = {}): PingRow => ({
  ping_id: "p1", post_id: "po1", category: "拼车", content: "K-town 拼车 3缺2",
  location: "K-town", poster_name: "学长", current_people: 1, max_people: 3,
  status: "open", score: 0.5, response: null, responded_at: null,
  created_at: new Date().toISOString(), matched_tags: ["korean_food"], best_facet: null, ...over,
});

describe("PingInbox", () => {
  it("renders the ✦ reason chip and the 加入/忽略 actions", () => {
    render(<PingInbox pings={[ping()]} onResponded={vi.fn()} />);
    expect(screen.getByText(/你提到 korean food/)).toBeTruthy();
    expect(screen.getByText("加入")).toBeTruthy();
    expect(screen.getByText("忽略")).toBeTruthy();
  });

  it("POSTs the response and shows the george handoff after 加入", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PingInbox pings={[ping()]} onResponded={vi.fn()} />);
    fireEvent.click(screen.getByText("加入"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/squad/me/pings/p1/respond",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByText(/george/i)).toBeTruthy();
    });
    vi.unstubAllGlobals();
  });

  it("disables 加入 on a full post but still allows 忽略", () => {
    render(<PingInbox pings={[ping({ status: "full" })]} onResponded={vi.fn()} />);
    expect((screen.getByText("加入") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("忽略") as HTMLButtonElement).disabled).toBe(false);
  });
});
