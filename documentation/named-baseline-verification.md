# Named baseline executable verification — 2026-11-16

Bounded Level 1 CLI regression verification; one coordinating agent followed
ellygent-vcycle implementation, unit verification, acceptance and release
procedures. No API, authentication or persistence contract change. No delegation
was needed. The current session model was used without changing model settings.

Benchmark: ae7d8a60a036cb1dd77b7fa21cb51c007350f9df (0.1.1).
HEAD checked before edits: 51d818776b5aaac0d9beac23eb9d9946f8170b01 (0.1.2).
The parser fix already exists in 038aafefe0b105d131eff4137f53074b7d9cd638:
Commander positional parsing prevents root --version stealing command values.

| Built executable / arguments | Exit | stdout | API / artifacts |
|---|---:|---|---|
| ae7d8a6 inspect, spaced B1 | 0 | exactly `0.1.1\n` | no request, no files |
| ae7d8a6 pull, spaced B1 | 0 | exactly `0.1.1\n` | no request, no files |
| ae7d8a6 inspect, equals B1 | 0 | one B1 JSON object | B1 contents request |
| ae7d8a6 pull, equals B1 | 0 | one success JSON object | B1 export; manifest.json and project-summary.md |
| 51d8187 inspect, both forms | 0 | one B1 JSON object | B1 contents request |
| 51d8187 pull, both forms | 0 | one success JSON object | B1 export; manifest identifier B1, summary B1 |

Full literal stdout, stderr, requested baseline, manifest and file lists:
[evidence before](evidence/named-baseline/ae7d8a6.jsonl) and
[evidence after](evidence/named-baseline/51d8187.jsonl).
Temporary output paths are retained verbatim; test directories were cleaned up.

This change strengthens the existing executable suite: the loopback fixture serves
distinct B1 and main inspection and archive data, with a successful main control.
It checks --version and -V, both baseline syntaxes on inspect/pull and deprecated
contents/sync, manifest identity, file bytes, and single JSON stdout (a banner
would make JSON.parse fail). Missing/empty values and unknown baselines in both
forms exit nonzero and leave empty export workspaces. Missing values exit 1;
unknown baselines exit 5 (fixture HTTP 400). Literal negative stdout is recorded in
[negative results](evidence/named-baseline/negative-results.jsonl).

The three baseline quickstart examples are read from QUICKSTART.md, executed
against the built executable, and checked for B1 results and manifests.
Only output workspace paths are replaced with isolated temporary directories.
These local fixture tests do not establish live service compatibility.

Executed on Node 24.18.0 / npm 11.16.0:
- npm run build: PASS, exit 0.
- npm run typecheck: PASS, exit 0.
- npm test: PASS, exit 0, 132 tests / 12 files.
- REQUIRE_CROSS_FS=1 npm run test:executable: PASS, exit 0; named baseline
  assertions and real cross-filesystem refresh passed.
- git diff --check: PASS.

CI inspection: release.yml already runs build, unit tests, typecheck and
test:executable on PRs/main/tags/manual dispatch; package-and-publish needs verify.
Remote CI execution: NOT RUN.

Live sign-in: NOT RUN.
Live export: NOT RUN.
After a separately approved release, install through the public installation
path and repeat using a separate read-only production test account. Record
installed ref/version, sign-in and export as separate results. No production
credentials or release are part of this local parser verification.

No push, tag, publication or deployment was performed. Concurrent changes to the
installed-artifact workflow and release documentation were observed and left
outside this change.
