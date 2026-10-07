# Contributing

Friction is a controlled browser-local comparison lab. Keep changes focused on the fixed RelayConf task, recorded evidence, explicit source labels and browser-tool lifecycle. Preserve the intentional baseline contract differences and the visible human approval of fixed repair FG-PATCH-01.

Use Node.js 24+ and pnpm 11.19.0. Install with `pnpm install --frozen-lockfile`, then run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:audit-policy` and `pnpm security:audit`. Inspect the retained full raw audit; it still reports the one accepted finding. Run `pnpm test:e2e` and `pnpm test:webmcp` sequentially after installing their browsers. Native checks require the browser's real experimental WebMCP API; ordinary registration-adapter checks do not certify it.

Explain the measured behavior, expected result and bounded impact. Include proportionate checks for meaningful behavior changes. Keep private runs, local storage, credentials, generated output and exploratory QA outside the source distribution.

The source ZIP helper requires a clean committed tree. CI verifies its file inventory, source bytes and checksums and runs the built app from a fresh extraction before publication. Main publication uses the exact verified commit, rejects a moved head or foreign draft/tag and verifies all three release assets. The strict policy accepts only the exact documented exception in [SECURITY.md](SECURITY.md). Every changed or additional finding, unavailable or malformed metadata, and newly available patch blocks release.
