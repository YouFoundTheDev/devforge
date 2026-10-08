# Live GitHub Actions Security Health Design

## Goal

Show real dependency-audit and container-scan outcomes in DevForge Service
Health, using the latest completed GitHub Actions run for a Catalog entity.
The existing mock mode remains deterministic and unchanged. This is a
portfolio/reference implementation, not a production security-monitoring
system.

## Current context

- Live Service Health already resolves `github.com/project-slug` from the
  Catalog and reads the latest completed GitHub Actions run for CI status.
- The shared health response models security status, findings, SAST, and
  container scan status, but has no dependency-audit field.
- The generated-service workflow runs `npm audit --audit-level=high` and Trivy
  with `CRITICAL,HIGH` thresholds. Its steps are named `Dependency audit` and
  `Scan container`.
- DevForge's own repository workflow does not yet run these security checks.
- GitHub Actions job responses expose each step's name and conclusion, which is
  enough for pass/fail without downloading reports or artifacts.

## Selected approach

Use GitHub's Actions REST API to get the latest completed run and that run's
jobs and step conclusions. A shared backend GitHub Actions client will provide
the run context to both CI and security adapters. Simultaneous requests within
one health aggregation share the in-flight run lookup; no persistent cache,
database, webhook, artifact, or new runtime dependency is introduced.

The existing `github.com/project-slug` annotation remains the sole repository
mapping. Only GitHub.com is supported. Add `dependencyAudit` to the shared
security response so the UI can report audit and container results separately,
without mislabeling dependency audit as SAST.

## Data flow

1. The health backend resolves the requested Component through the Catalog
   using its own Backstage service credentials.
2. The backend validates `github.com/project-slug` and requests the latest
   completed run from GitHub's Actions runs endpoint.
3. The shared client requests jobs for that run and reads each job's steps.
4. The CI adapter maps the run conclusion as it does today. The security
   adapter matches the exact step names `Dependency audit` and `Scan container`
   and maps their conclusions into the security DTO.
5. The existing health API returns the combined live response. No credential
   or raw GitHub response is sent to the frontend.

## Security result mapping

| GitHub Actions step result                                | Health response                |
| --------------------------------------------------------- | ------------------------------ |
| `Dependency audit` conclusion `success`                   | `dependencyAudit: PASS`        |
| `Dependency audit` conclusion `failure`                   | `dependencyAudit: FAIL`        |
| Step missing, skipped, cancelled, or otherwise unmappable | `dependencyAudit: UNAVAILABLE` |
| `Scan container` conclusion `success`                     | `containerScan: PASS`          |
| `Scan container` conclusion `failure`                     | `containerScan: FAIL`          |
| Step missing, skipped, cancelled, or otherwise unmappable | `containerScan: UNAVAILABLE`   |

Overall security status is `FAILING` if either check fails, `PASSING` only if
both checks pass, and `UNAVAILABLE` otherwise. The security score and all
finding counts remain `null`; they cannot be determined from step conclusions.
SAST remains `UNAVAILABLE` because neither workflow runs a SAST scanner.

GitHub API, network, timeout, and malformed-response failures produce a generic
security source error and unavailable security data. Missing or skipped scan
steps are represented as unavailable results, not as API errors. Existing
backend-only `GITHUB_TOKEN` configuration remains optional for public
repositories and is never logged or returned to the client.

## Workflow changes

- Add a `Dependency audit` step to DevForge's own CI using
  `yarn npm audit --all --severity high`.
- After the backend image is built, run Trivy on that image in the step named
  `Scan container`, using the same `CRITICAL,HIGH` blocking threshold as the
  generated-service template.
- Keep the generated-service workflow's audit and Trivy checks, using the
  same exact names so one provider supports both workflow styles.
- Preserve normal CI failure behavior. If checks are skipped because an
  earlier step failed, their security results are unavailable.

## UI and mock behavior

- Add the `dependencyAudit` field to the shared Zod response schema, mock
  fixtures, and frontend Security card.
- Display audit and container statuses independently. Display `UNAVAILABLE`
  for the finding counts, score, and SAST; do not infer zero findings from a
  passing step.
- Keep deterministic mock values and the `MOCK DATA` indicator unchanged.
- In live mode, entities whose workflow has no matching scan steps report
  unavailable scan results rather than fixture data.

## Testing and acceptance criteria

- Unit tests cover passing, failing, missing, skipped, and malformed step
  results, plus GitHub API and network errors.
- Tests verify that CI and security use the same latest-run context and that
  in-flight requests are coalesced without persistent caching.
- Aggregator tests cover partial live results and security status mapping.
- Frontend tests display independent audit and container outcomes and preserve
  explicit unavailable counts/SAST.
- Generated-service fixtures and schema tests include `dependencyAudit`.
- Strict config validation, backend/frontend tests, lint, typecheck, and full
  build pass.
- DevForge's own GitHub Actions workflow completes its dependency audit and
  container scan; the live health endpoint reports their actual step results
  for `component:default/devforge-portal`.

## Non-goals

- Vulnerability counts, scores derived from findings, SAST, SARIF, or code
  scanning integration.
- Security report artifacts, artifact downloading, webhooks, persistent
  caching, or a security database.
- GitHub Enterprise and non-GitHub workflow providers.
- Changes to the existing mock security fixture values.
