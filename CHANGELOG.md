# Changelog

## 0.1.2 — 2026-11-16

- Fix spaced named-baseline options being consumed as the CLI version action;
  preserve both baseline syntaxes, top-level version and legacy aliases.
- Stage context exports on the destination filesystem, validate before promotion,
  retain the previous export, roll back failed promotion and document recovery.
- Gate releases on lockfile installation, typecheck, build, the full suite and
  executable fixture checks including real cross-filesystem and injected failures.
- Generate and validate installer release assets without private frontend access.
- Correct quickstart, ReqIF, JSON automation and build provenance documentation.

Production authentication, live export, first-time usability and Windows/macOS
filesystem behavior are not established by these local fixture checks.
