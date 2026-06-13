# Onboarding handshake assets

Served at `https://uscbia.com/onboarding-assets/<filename>`. The george
backend's Path B (iPhone Shortcuts) iMessage handshake rewrites its local
attachment paths to URLs under this folder via `ONBOARDING_ASSET_BASE_URL`
(see george's `.env.example` and CLAUDE.md "Onboarding handshake (Slice B)").
The iPhone Shortcut downloads these URLs and attaches them in Messages.app.

Files mirror `assets/onboarding/` in the george repo. Filenames are the
contract — george maps by basename, so renaming a file here breaks the
handshake until george's `src/onboarding/showcase.ts` is updated to match.

## Placeholders to replace before launch

- `showcase-1.png` … `showcase-5.png` are 70-byte stubs. Real images are
  generated externally (Bobby, GPT Image 2, BIA brand style) per the Slice B
  plan. Replace here AND in george's `assets/onboarding/` so Path A (Mac
  bridge, sends local files) and Path B (these URLs) stay identical.
- `george.vcf` carries the placeholder number `+1XXXXXXXXXX`. Swap in the
  real `GEORGE_IMESSAGE_PHONE` before launch, in both repos.
