# Navigation Shell Unification

Approved scope: **unify all surfaces onto `ProductShell`** (including the
marketing pages) and **migrate the NavTabs page-groups into `ProductShell`**,
then retire NavTabs. App-wide UI language default is `en`.

## Why

Before this work there were ~5 parallel navigation/header systems and two
language systems:

| System | Pages | Language |
|---|---|---|
| Marketing navbar (GlassSurface) | `/`, `/join` | `Lang` + local `useState` (not persisted) |
| `ProductShell` | `/roommates`, `/sublet`, `/account` | `ProductLanguage` + localStorage |
| `NavTabs` (hardcoded 中文) | `/shipping/*`, `/squad`, `/course-rating/*`, `/course-planner`, `/usc-group` | none |
| Bespoke / themed | `/george`, `/george/chat`, `/hackathon`, `/privacy`, `/blog/*`, `/account/george` | none |

The split language model was the root cause of the "English AuthModal in 中文
mode" bug: only `ProductShell` had a language in scope at its `AuthModal`
render; the other 9 call sites had none.

## Phased migration order

### Phase 0 — single language source of truth ✅ done
- `components/LanguageProvider.tsx` + `useLanguage()` (persisted under the
  existing `bia-product-language` key). Default `en`.
- `ProductShell` and the marketing pages now read this provider instead of
  their own state.
- `AuthModal` falls back to `useLanguage()` when no `language` prop is passed,
  which localizes **all** call sites — closes the i18n bug.

### Phase 1 — (skipped) localize NavTabs
Not needed under the approved scope: NavTabs is being retired in Phase 2.

### Phase 2 — migrate NavTabs pages → ProductShell (one page-group per commit)
`shipping/*`, `squad`, `course-rating/*`, `course-planner`, `usc-group`. Each
page wraps its content in `<ProductShell group=… page=…>` and drops its local
`<NavTabs />`. `ProductShell`'s `ProductPage`/`ProductGroup` types already
enumerate exactly these, so this is the designed end state.

### Phase 3 — marketing + bespoke
- Move `/` and `/join` into the shared shell chrome (per approved scope).
- Extract the duplicated landing/join GlassSurface navbar (incl. the PR #71
  mobile menu) so there's one implementation.
- Themed pages (`hackathon`, `privacy`) keep their aesthetic but adopt the
  shared language context + a shared minimal top bar.

### Phase 4 — cleanup
- Delete `NavTabs` and `PlannerHeader` once unused.
- Collapse `Lang` and `ProductLanguage` into one `Language` type.
- Drop now-redundant per-call-site `AuthModal` `language` props.

## Validation note

Local `npm ci` is blocked in the dev container (private
`@biboyang425/bia-shared` registry token), so phases are syntax-checked with
esbuild and validated by this PR's CI typecheck/build.
