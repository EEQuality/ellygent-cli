# Trusted build and CLI publishing

This workflow is for future tags only. It does not apply a retrospective signing
claim to an existing release. A protected tag and attestation are separate
controls: the build cannot publish, and the publish job can only upload the six
specific files covered by the verified manifest.

## Owner prerequisites before activation

1. Independently review and merge the workflow/scripts through the usual PR.
   Configure an enforced tag ruleset covering release `v*` tags: authorized
   creators only, prohibit update/deletion and reject bypass users not required
   for emergencies. `github.ref_protected` detects the presence of rules and
   does **not** prove their strength. Configure/confirm required reviewers and
   exact tag-only deployment policy on existing `cli-release` environment.
   No settings or approvals are changed by this code.
2. Independently verify official action commit identities and the scanner archive
   SHA256 before setting `CLI_TRIVY_VERSION` (numeric version) and
   `CLI_TRIVY_ARCHIVE_SHA256` (Linux x64 tar archive). The hosted build scans the
   exact full npm lock including development dependencies and retains its
   database timestamp, dependency report and nonempty CycloneDX SBOM. High/
   critical findings, absent lock inventory and stale scanner DB all block.
3. Use a **new** reviewed immutable release tag with matching manifest,
   lockfile, version, installer app commit and release notes. Dispatch
   **Trusted CLI release builder (no publish)** explicitly selecting that tag.
   Code/TypeScript config parity against the app pin is required. The build job
   has read-only contents access; the separate attestation job has OIDC,
   attestations write and artifact read only.
4. Inspect the successful builder run and independently verify the
   `release-evidence.json` attestation on the original downloaded artifact:

   ```bash
   gh attestation verify release-evidence.json --repo EEQuality/ellygent-cli \
     --signer-workflow EEQuality/ellygent-cli/.github/workflows/trusted-release-builder.yml \
     --signer-digest "$REVIEWED_WORKFLOW_COMMIT" --source-digest "$REVIEWED_TAG_COMMIT" \
     --source-ref "refs/tags/$REVIEWED_TAG" --deny-self-hosted-runners
   ```

   Review the exact six file hashes and app/lock pin; preserve evidence under
   the owner's retention policy. Choose an explicit independently verified gh
   binary SHA256 for the hosted runner, matching the exact verifier binary, and
   scope the release variables to the protected publish environment when
   practical. Set `TRUSTED_GH_SHA256`, `TRUSTED_RELEASE_SIGNER_SHA`,
   `RELEASE_BUILDER_RUN_ID` and `RELEASE_SECURITY_GATES_CONFIGURED=true`.
5. Rerun the already-triggered tag release pipeline if its initial publish gate
   could not see evidence. Approve the existing protected environment only
   after verifying the completed independent run and these exact values. The
   publisher does not rebuild or install packages with its release credential.
   It downloads the exact eligible run artifact; checks GitHub runner, signer,
   source, tag, app pin and every uploaded digest; re-resolves the remote tag;
   and only then calls `gh release create`. A trusted run that is missing,
   expired, mismatched or inaccessible blocks. A rolling runner gh binary hash
   change also blocks; review any replacement before updating the pin.
6. Independently verify public release bytes and installed version before
   promoting or mirroring the website installers. Website mirror and release
   automation are separate and are not changed here.

## 0.1.4 audit (historical; not signed)

The original published release used the ordinary workflow
[44807268123](https://github.com/EEQuality/ellygent-cli/actions/runs/44807268123),
tag commit `30e4b3e3a1a3ba71fba26cfbfb4f7a8befad7e7e`, app pin
`87f3a44c5b748514fb9305d4293a3a72cc1b8449` and npm lock SHA256
`ad5f04da0a90d53e61609a9ba60a9ea9727e93b348047581497ae7fcf09e6678`.
Its tarball attestation lookup returned HTTP 404. The job list records no
attestation. All six GitHub asset digests matched downloaded bytes and the four
website files were byte-identical to their GitHub counterparts.

A separate clean build from the exact tag used a fresh npm cache,
`npm ci --ignore-scripts`, `npm run build`, official `npm run publish:frontend`,
`npm pack --ignore-scripts` and the original `sha256sum` command. Node
20.20.2/npm 10.8.2 (the official job toolchain) and, separately, local Node
24.18.0/npm 11.16.0 both reconstructed all six published artifacts byte for
byte. This verifies reproducibility, not GitHub signed provenance.

A Linux smoke used the verified website installer in an isolated managed prefix:
it reported CLI 0.1.4 and the intended app commit, and `ellygent public list
--json` returned the public AuRoVac example without credentials. No installed
default or publisher setting was changed during the audit. No v0.1.4 assets or
tag were replaced or re-signed.
