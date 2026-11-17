# CLI local verification and release prerequisites

See [README](README.md) for the pinned default and [RELEASE-INTEGRITY](RELEASE-INTEGRITY.md)
for independently trusted bootstrap checks, managed install/rollback, explicit development
and the disabled-by-default scan/SBOM/provenance publication gates.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test
npm run test:installer-integrity
npm run test:release-security-policy
npm run test:executable
npm run test:installed
```

The last two commands need isolated local fixture services and native filesystem support.
Do not fall back to production when unavailable. No release/push/tag/registry operation
is part of these local checks. Native Windows/PowerShell validation and external attestation
configuration remain separate release-owner prerequisites.


## Context command quick reference

### Usage

```bash
# Login
ellygent auth login --token <your-personal-access-token>

# Check authentication status
ellygent whoami

# List projects
ellygent projects --org my-org

# Inspect a saved baseline (replace demo and B1 with your identifiers)
ellygent context inspect --project demo --version B1 --json

# Download that baseline
ellygent context pull --project demo --version B1 --workspace ./engineering-context --json

# Equivalent spelling; run in a separate workspace or refresh the same export
ellygent context pull --project demo --version=B1 --workspace ./engineering-context --json

# Help
ellygent --help
```
