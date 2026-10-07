# Security and dependency status

Friction 1.1.1 supports the fixed simulated RelayConf task. It records browser-local evidence; it does not scan external systems, make real registrations or certify a remediation.

Treat run content, caller-supplied findings and notes as untrusted. Browser storage and exported JSON are editable and are not independent audit evidence. Use one tab per experiment, export before replacing a run or applying the fixed repair, and review the recorded task evidence before drawing conclusions.

## Dependencies

Install using the frozen lockfile and run `pnpm security:audit` when changing dependencies. CI retains the complete audit reports and checks current dependency metadata. Available transitive patches are applied through scoped overrides.

## Reporting

For a suspected vulnerability, use the repository's private security reporting feature when available. Include the exact source version, affected behavior and supporting evidence. Do not post private run data, browser storage or credentials in a public issue.
