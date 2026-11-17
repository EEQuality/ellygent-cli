# CLI release process

Publication is disabled by default until a trusted scan/SBOM/attestation builder and
protected release environment are configured and independently reviewed. Read
[RELEASE-INTEGRITY.md](RELEASE-INTEGRITY.md) before attempting any release operation.
No release is authorized by this local patch. Never move/reuse the v0.1.2 tag.

Verification retains typecheck/build/unit, installed-artifact, named-baseline parsing,
export safe-refresh and real cross-filesystem regression gates. New installer integrity
fixtures use disposable directories and inert npm/Git callbacks; they do not replace
native installed-artifact tests. Use Node20+ and the checked-in lockfile, with npm ci.

A new version needs an explicitly reviewed immutable source commit and lock hash. Update
the trusted installer release record only after those values are independently verified;
then refresh wrapper runtime hashes and deterministic hosted assets. Source candidate and
installer-distribution commits may be separate to avoid a self-referential commit hash.
The signed evidence must bind the distribution commit and exact published bytes, while
the release record identifies the source candidate it builds. Validate this release
process with the release owner before enabling automation. An old default pin must never
silently stand in for a newly advertised version.

Workflow verify runs on PR/main/tag; the trusted verifier runs only reviewed push tags
in EEQuality/ellygent-cli with cli-release environment approval. Manual dispatch is verify
only. Publication needs both jobs successful, tag/package/executable/pin-version agreement,
exact checkout, and a byte-for-byte match to independently attested installer evidence.
Only the four enumerated installer artifacts are attached; no frontend deployment occurs.
All pushes, tags, attestations, environment configuration and publication require separate
user/operator authorization. None were performed for this patch.
