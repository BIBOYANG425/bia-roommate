import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// The database schema is owned by bia-admin. Migrations live there under
// docs/schema-history/bia-roommate/ and are applied from that repo only.
// This repo must NOT carry its own supabase/migrations — stale local copies
// (e.g. enqueue_parcel_notification / admin_patch_parcel /
// admin_attach_parcels_to_shipment) once drifted from the real schema and
// could clobber production if db-pushed. This guard fails loudly if a local
// migrations directory ever reappears.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("no local database schema (bia-admin owns the schema)", () => {
  it("has no supabase/migrations directory", () => {
    const migrationsDir = resolve(repoRoot, "supabase/migrations");
    expect(
      existsSync(migrationsDir),
      "supabase/migrations must not exist — the schema is owned by bia-admin " +
        "(migrations live in bia-admin docs/schema-history/bia-roommate/). " +
        "Do not add SQL migrations to this repo; they can clobber production.",
    ).toBe(false);
  });
});
