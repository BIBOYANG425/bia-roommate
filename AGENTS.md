<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Route file exports are whitelisted (Next.js 16)

`app/**/route.{ts,tsx}` accepts ONLY HTTP method handlers (`GET`, `POST`,
`PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`) plus a small set of config
exports (`runtime`, `dynamic`, `revalidate`, `preferredRegion`,
`maxDuration`, `fetchCache`, `dynamicParams`). Any other export fails
`next build` typecheck (Vercel will reject the deployment) — even though
plain `tsc --noEmit` accepts it.

**Don't** export helpers, validators, or `__test` objects from a route file
for unit tests. Put the helper in a sibling module (e.g.
`app/api/foo/parse.ts`) and import it from both the route and the tests.

To reproduce the Vercel build typecheck locally:
`env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production npx --no-install next build`

<!-- END:nextjs-agent-rules -->
