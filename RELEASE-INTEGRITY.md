# CLI 0.1.4 release identity

Managed installers select source `87f3a44c5b748514fb9305d4293a3a72cc1b8449`,
package version 0.1.4 and lock SHA256 `ad5f04da0a90d53e61609a9ba60a9ea9727e93b348047581497ae7fcf09e6678`.
The release commit adds installer pins/records; the workflow verifies application
source and package/lock bytes equal the selected source before publication.

CLI 0.1.4 adds anonymous public snapshot browsing. It uses the existing ordinary
GitHub-hosted release workflow with immutable pins, parser/refresh, installer,
installed-artifact, and native Windows regression gates. Independent attestation
and live private-project QA were not run; no new waiver or signing trust is claimed.

The following sections retain the historical security-review baseline and its
bootstrap/operational limitations. The owner-authorized 2026-11-20 exception below
superseded the proposed mandatory independent-builder/manual approval scaffold.

# CLI release integrity and operator transition

This patch is local source, not a published release or configured signing system.
Default source is the existing audited v0.1.2 commit
`51d818776b5aaac0d9beac23eb9d9946f8170b01`, locally revalidated from its Git tag.
Pinned package-lock SHA256 is
`6a74281752c87bc2bfbc30300b997e39e250ef5f3ba3f49fdb74200e4af5ebe4`.
No new release keys, artifact hashes, tag or attestation was invented.

## Bootstrap trust and installation

Download and inspect the shell/PowerShell wrapper. Compare its SHA256 against a release
record obtained through a separately trusted channel before running it. Downloading the
wrapper and its checksum from the same mutable website is not independent verification.
The committed distribution summary contains hashes for reproducibility, **not a signature**.
No signature-verification key or trusted release-builder attestation is configured here.

The trusted wrapper pins the common Node runtime's SHA256 before executing it. Its fixed
repository fetch is by the audited full commit, not main or a mutable tag. It checks exact
HEAD, package name/version and independently pinned lock hash before npm can execute code.
Before init and the first checkout, installer Git commands ignore inherited global/system/
environment Git configuration, global/system attributes and user templates/hooks. The
source checkout explicitly uses core.autocrlf=false and LF, then compares every supported
tracked regular file with its Git index blob bytes before npm. A clean git status alone is
insufficient: normalization can hide CRLF differences. Any remaining repository-authored
encoding/EOL transformation is refused rather than weakening the reviewed hash comparison.
Explicit developer mode remains available with independently trusted commit/lock/version;
unsupported transformed/symlink/submodule source layouts must be reviewed separately.
The installer does not change users' Git settings. Corporate proxy/credential Git config
is not inherited; public HTTPS source retrieval requires trusted installed Git/OS networking.

`npm ci --ignore-scripts` respects the reviewed lockfile and suppresses dependency lifecycle
hooks; the approved source build script is then invoked explicitly. npm CLI JavaScript is
located from the installed Node distribution (or explicit trusted ELLYGENT_NPM_CLI), avoiding
shell command-string interpolation and .cmd argument hazards on Windows.

The default install root is `~/.local/share/ellygent-cli`, overridable explicitly with
ELLYGENT_INSTALL_ROOT. Both aliases live in its bin directory. Add that directory to PATH
explicitly; the installer never edits PATH or uninstalls an npm-global working command.
This is a deliberate migration from the old global npm replacement. Keep the old global
command as a fallback until the managed one is verified and you choose its PATH order.
Check `command -v ellygent` / `Get-Command ellygent` to distinguish them.

An exclusive managed-directory lock serializes upgrades. A candidate is built in a new
same-filesystem version directory, checked by absolute entry point for reported version,
and recorded with exact commit/lock hash and executable/package checksums. Only then is
current.json atomically renamed to select it. Failed download, source validation, npm,
build, version check or promotion leaves the old current selection unchanged. Orphaned
verified candidate versions may remain after a failed promotion; inspect them before
manual cleanup. No existing version/backup is automatically deleted.

Rollback uses the retained trusted runtime: `node install-runtime.mjs rollback` (or
`sh ./verified-installer.sh rollback`, PowerShell `-Rollback`). It verifies the previous
managed version's identity and recorded executable hashes before atomically changing
selection. It does not modify credentials/context workspaces. Receipt hashes cover dist/package/lock, not every installed node_modules file; dependency
integrity is checked by npm ci against the pinned lock during installation. Receipts are not signatures
or a defense against an attacker who already controls the same user account and can edit
both executables and receipts. On crash, the lock may remain: confirm no installer is
active and inspect state before an operator removes that stale lock.

## Explicit development and new releases

Unknown VERSION values and main fail closed by default. Development is explicit:

```
ELLYGENT_DEV_CHECKOUT=1
VERSION=main
ELLYGENT_EXPECTED_COMMIT=<independently verified full commit>
ELLYGENT_EXPECTED_LOCK_SHA256=<independently verified lockfile SHA256>
ELLYGENT_EXPECTED_VERSION=<expected package version>
```

These are input placeholders, not supplied real trust values. Set them in the environment
for the reviewed wrapper; it still fetches the exact provided commit, never resolves main
as trust. Local development source checkout/build remains available without replacing the
working installation. A new official release needs a reviewed source/version/lock pin update
and fresh wrapper-runtime checksums, distribution summary and independent release record.
Do not move or reuse v0.1.2, whose parser and safe-refresh identity remain unchanged.

The earlier local canonical export-path fix is retained in this patch's source baseline,
but is not retroactively in the shipped v0.1.2 source pin. A future reviewed published
release/pin must include that fix before claiming the default installer includes it.
Package/version equality alone is insufficient because historical checkouts shared versions.

## Disabled release security gate scaffold

Publication now depends on verify **and** security-gates. CLI_RELEASE_SECURITY_GATES_CONFIGURED
is unset/false by default, so the security job and publication remain disabled. Merely
setting it true is insufficient: the dedicated reviewed-tag-only verifier runner, protected
cli-release environment, trusted gh verifier binary hash and attested evidence files must
exist. PR/untrusted branch code never runs on that trusted verifier runner. Declaring an
environment in YAML does not create human approval: operators must separately configure
reviewers, branch/tag restrictions and least privilege. No GitHub settings changed here.

Required separately reviewed workflow identity:
`EEQuality/ellygent-cli/.github/workflows/trusted-release-builder.yml`.
It is **not created/configured** by this patch. Provision a trusted build/scan pipeline that:

1. Uses exact source and lockfile, pinned runner/toolchain, dependency scanner identity and
   fresh vulnerability DB. Produce an SCA report for the full release lock, runtime and
   build dependencies; do not run an external scanner from an unreviewed downloaded script.
2. For application/container artifacts, inventory immutable image digests and scan those
   exact built images, including base/runtime packages. An application with no image
   inventory fails. The current CLI is a Node source package with no container artifact;
   evidence must explicitly say not_applicable/no-container-artifact rather than pretend
   a container scan ran. Reusing the pure policy for app releases needs a separate adapter.
3. Generate a nonempty CycloneDX SBOM and retain dependency/container reports. Recommended
   tool choices (not installed/executed here): npm audit or a reviewed SCA tool, Syft/npm
   SBOM, and pinned Trivy/Grype for containers. Resolve exact versions/binary hashes and DB
   freshness policy through release-owner review before configuring the runner.
4. Build deterministic installer assets and a release-evidence.json file binding exact
   source commit, package version, lock SHA256, scanner identities/results, SBOM and SHA256
   of every published artifact. Sign/attest this evidence via the separately configured
   GitHub trusted builder. A JSON field saying pass is not cryptographic proof.
5. Verify evidence using pinned trusted gh binary with `gh attestation verify`, fixed repo/
   signer workflow and exact source digest; operators must validate installed gh feature/
   flag compatibility. Only verified evidence is parsed. Every published wrapper/runtime/
   summary byte must match its attested checksum; the publication job checks again after
   local bundle generation. No unchecked wildcard artifact upload remains.

Evidence schema1: `kind` cli/application, `sourceCommit`, `packageVersion`, `lockSha256`,
`builderWorkflow`, `containerImages`, `scans.dependency` (complete status, integrity-bound reportFile, matching lock,
pinned scanner name/version/binary SHA256, high/critical integers, DB date), container
scan with the same fields plus exact scannedImages or explicit CLI not-applicable,
`sbom` {format:CycloneDX,file:basename}, `files` [{name:basename,sha256:...}]. The pure-policy
fixture tests are the synthetic exact schema reference; their hashes/results are never
release evidence. Use only regular task-owned evidence files on the trusted runner.

Default triage blocks any unresolved high or critical finding; invalid/missing/older-than-
7-day/future DB metadata also blocks. Moderate/low findings need owned tickets and a
reviewed remediation target (suggested 30/90 days, not a configured guarantee). Exploited
or reachable critical findings merit release suspension regardless of a numeric score.
No automatic waiver exists. A necessary time-bounded exception requires an explicit
policy review with owner, scope, rationale, compensating controls and expiry; it is not
silently accepted through a report field. Preserve reports/SBOM/provenance with release
artifacts under an owner-approved retention policy; no retention settings are changed.

Known action SHA pins in workflow must be independently verified against official
checkout/setup-node source by the release owner before enabling it. Verification of
external action provenance, scanner execution, real GitHub attestations/publication,
Windows/macOS native filesystem behavior and browser presentation remains NOT RUN.
Existing executable/installed v0.1.2 named-baseline and safe-refresh regressions remain
release-blocking CI steps; fixture-only installer checks cannot replace those gates.


### Checkout-byte maintenance and regression

After reviewing a shared-runtime source change, run the local-only
`node scripts/update-installer-runtime-pin.mjs`, then the explicit FRONTEND_ROOT publisher.
The generator changes only the two known wrapper pin assignments; the publisher refuses a
stale pin before writing hosted files. This is local artifact synchronization, not release
publication or creation of independent signing trust. `npm run test:checkout-bytes` uses
Python3 and existing local Git objects in disposable fixtures; it never fetches or installs.
It covers inherited autocrlf true/false, inert inherited transform/hook/template refusal,
non-lock source transformation detection and stale-pin hosted-copy refusal. Native Windows
execution remains a separate gate; the same byte policy is shared by both wrappers.


## 2026-11-20 owner-authorized release exception

The owner explicitly directed removal of the additional manual approval and special
attested-builder/staging gates for this release. Publication uses the ordinary
GitHub-hosted regression/build workflow, immutable source/lock pins and asset
checksums. No independently attested builder or live QA pass is claimed. The
fail-closed policy helper remains available for future separately authorized use.
Existing parser, context-preservation, checkout-byte, safe-installer and native
Windows regression checks remain blocking. Historical v0.1.2 is not retagged.
