import { describe, it, expect } from "vitest";
import { respondStatusForError } from "./parse";

describe("respondStatusForError", () => {
  it("maps RPC raises to HTTP codes", () => {
    expect(respondStatusForError("already_responded")).toBe(409);
    expect(respondStatusForError("not_your_ping")).toBe(403);
    expect(respondStatusForError("ping_not_found")).toBe(404);
    expect(respondStatusForError("invalid_response")).toBe(400);
  });
});
