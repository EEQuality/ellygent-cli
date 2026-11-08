# Anonymous sandbox CLI audit and traceability

This extends the existing TypeScript ESM/Commander CLI. It does not introduce a new context client, exporter, package format, or registered-user authentication mechanism.

## Existing capabilities

| Area | Existing implementation and behavior |
| --- | --- |
| Installation | README official hosted shell/PowerShell wrappers clone GitHub source, install dependencies, build and install globally. Manual Git checkout/build is supported. No npm-registry distribution assumption. |
| Authentication | `auth login --token` accepts `elly_pat_`, validates through context organization discovery, and stores the PAT. Environment token support remains unchanged for the normal config. |
| Configuration | `ConfigStore` uses atomic rename and `0600` files. Existing normal paths remain unchanged. New explicit global `--config` selects an isolated file and ignores environment overrides. |
| Project selection | `--project`, stored `defaultProject`; `--org`, stored `defaultOrg`. Pairing stores the server-authorized defaults. |
| API architecture | `ClientFactory` constructs the existing `ContextApiClient`, which uses bearer `HttpClient`; no sandbox-specific context read client. |
| Discovery | `context orgs`, `projects`, `versions`, `inspect` provide metadata and exportable specifications/system definitions. Server must constrain these results. |
| Requirements/context | Existing `context pull` retrieves context packages including requirements and associated engineering material. |
| Relationships | Existing `--include-traceability` requests relationship/traceability context. |
| Exports | Existing context package/JSON and Markdown conversion, ReqIF/ReqIFZ paths. Availability of each export still depends on server authorization. |
| Errors | Existing structured errors and exit codes retained. Pairing does not emit raw response bodies, device secrets or access tokens. Sandbox bearer strings are redacted by the shared sanitizer. |

## Pairing interface

1. `ellygent --config <separate-file> sandbox connect --project <identifier> --api-url <server>` sends an unauthenticated `POST /api/v1/sandbox/cli/device/` with `{project_identifier}`. Pairing refuses the normal config or any credential already in the selected file.
2. The response contains `{device_code,user_code,verification_uri,expires_in,interval,project_identifier?}`. Only the human code, verification URL and lifetime are displayed on stderr. HTTPS is mandatory except loopback development. Verification URLs cannot contain credentials, query parameters or fragments.
3. The browser holding the existing sandbox session enters the user code and approves. The CLI never receives browser cookies. The CLI waits at least `interval` before sending `POST /api/v1/sandbox/cli/token/` with `{device_code}`. `authorization_pending` continues; `slow_down` permanently adds five seconds; HTTP 429 respects the greater of increased interval and numeric Retry-After.
4. Success requires `{access_token,token_type:'Bearer',expires_at,project_identifier,organization_identifier}` with the canonical project from the device response (or exact requested project for older servers), `elly_sb_` prefix, and future expiration. The credential and defaults are stored through `ConfigStore`. Expiration/reuse/denial stops polling without saving. Requests do not follow redirects, attach bearer credentials, send cookies or log bodies.
5. Existing commands use `--config <same-file>`. `auth status` labels sandbox credentials and includes expiration in structured output. `auth logout` removes the local copy; browser disconnect handles server revocation.

Server-side ownership, isolation, rate limits and lifecycle validity are mandatory; local validation is not an authorization boundary.

## Requirement-to-evidence map

| Criterion | Implementation | Automated evidence |
| --- | --- | --- |
| Browser pairing without registration or PAT | `SandboxService`, `sandbox connect` | sandboxService.test: device contract, no Authorization/cookies, verification instructions |
| Polling limits and short lifetime | `SandboxService.connect` | pending, slow_down, Retry-After, local expiry, expired/reused/denied responses |
| Preserve normal authenticated configuration | Separate global config and existing ConfigStore | PAT file byte preservation, environment isolation, reject normal path/existing PAT; existing authService tests |
| Secure credential storage and no secret output | ConfigStore 0600; pairing fixed error strings; shared sanitizer; config get masks sandbox tokens | file mode assertion, invalid/misbound credentials not persisted, server/network secret errors suppressed |
| Reuse context API and project defaults | Existing ContextApiClient; persisted project/org | stored defaults and existing context request uses sandbox bearer |
| Malformed and unsafe responses | Pairing validation | invalid expiry/type/project/token prefix/interval/verification URL cases |
| Cross-session ownership, writes/AI denial, revocation, expiration and other projects | Backend authorization, not CLI hiding | Must be established by backend security/integration suite; CLI unit mocks are not proof |

Executed checks and full cross-repository integration results are recorded in the coordinating task report. No deployment, publishing, installer execution or production request is implied.
