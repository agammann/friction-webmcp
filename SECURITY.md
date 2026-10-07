# Security and dependency status

Friction 1.1.1 supports the fixed simulated RelayConf task. It records browser-local evidence; it does not scan external systems, make real registrations or certify a remediation.

Treat run content, caller-supplied findings and notes as untrusted. Browser storage and exported JSON are editable and are not independent audit evidence. Use one tab per experiment, export before replacing a run or applying the fixed repair, and review the recorded task evidence before drawing conclusions.

## Dependency release gate

Available transitive patches for source-map-js 1.2.2, tinypool 2.1.2 and sharp 0.35.5 are applied through scoped overrides and the frozen lockfile. The full audit now records one high-severity finding and zero critical findings.

The remaining finding is **braces 3.0.3**, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), through `vinext > vite-plugin-commonjs > vite-plugin-dynamic-import > fast-glob > micromatch > braces`. The observed audit classifies it as a **production dependency** (`dev: false`, `optional: false`, `bundled: false`). Its position in build-related tooling does not change that recorded classification.

The official advisory identifies affected versions through 3.0.3 and no fixed release. The audit suggests `>=3.0.4`, but the checked npm registry still reports 3.0.3 as latest and does not publish 3.0.4. This does not constitute a zero-finding audit or a verified application exploit.

The remaining exact finding is explicitly accepted for this release. `pnpm security:audit` runs and retains the full raw audit, which still exits 1 with one high finding, then verifies the official advisory and npm registry. It accepts only the documented advisory, installed version, severity, single dependency path, `dev: false` classification, nonoptional/nonbundled flags and exact vulnerability counts while no patch is available.

Changed or additional findings, changed classification or paths, malformed or unavailable metadata and any possible newly published patch fail the required policy. Clean audit results still require valid verification metadata. There is no blanket severity ignore or zero-finding claim. Run `pnpm test:audit-policy` for the focused policy cases; CI retains the raw audit and metadata reports.

## Reporting

For a suspected vulnerability, use the repository's private security reporting feature when available. Include the exact source version, affected behavior and supporting evidence. Do not post private run data, browser storage or credentials in a public issue.
