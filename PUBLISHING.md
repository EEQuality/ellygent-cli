# CLI release process

The configured release workflow uses ordinary GitHub-hosted Linux and Windows
regression gates, then publishes on an authorized version tag through the
`cli-release` environment. Read [RELEASE-INTEGRITY.md](RELEASE-INTEGRITY.md) for the
immutable source identity and historical policy transition. Independent attestation
and live private-project QA are not configured release checks and are not claimed.
Never move or reuse an existing release tag.

Verification retains typecheck/build/unit, installed-artifact, named-baseline parsing,
export safe-refresh and real cross-filesystem regression gates. New installer integrity
fixtures use disposable directories and inert npm/Git callbacks; they do not replace
native installed-artifact tests. Use Node20+ and the checked-in lockfile, with npm ci.

A new version needs an explicitly reviewed immutable source commit and lock hash. Update
the trusted installer release record only after those values are independently verified;
then refresh wrapper runtime hashes and deterministic hosted assets. Source candidate and
installer-distribution commits may be separate to avoid a self-referential commit hash.
The release record identifies the source candidate it builds; published asset
checksums bind the distributed bytes for reproducibility, without claiming an
independent signature or attestation. An old default pin must never silently stand
in for a newly advertised version.

Workflow verification runs on PR/main/tag; native Windows regression checks run
separately. Manual dispatch verifies without publishing. Publication requires both
configured jobs to pass, tag/package/executable/pin-version agreement, exact checkout,
and source/lock equality with the pinned source candidate. Release assets are the
three installer files, distribution summary, SHA256SUMS, and versioned npm tarball.
No frontend deployment occurs.
All pushes, tags, attestations, environment configuration and publication require separate
user/operator authorization. None were performed for this patch.
