# Live GitHub Actions Health Design

## Goal

Extend DevForge Service Health with a real GitHub Actions CI signal while
preserving the deterministic, credential-free mock experience. A recruiter or
developer can open the DevForge portal's entity page and see the most recent
completed GitHub Actions result for this public repository. Catalog services
can use their own repository mapping through `github.com/project-slug`.

This is a portfolio/reference implementation, not a production monitoring
system.

## Current context

- The frontend health entity-content extension currently applies only to
  Component entities with `spec.type: service`.
- The DevForge portal entity is a Component with `spec.type: website`.
- The current cybersecurity service descriptors use illustrative
  `github.com/project-slug` values under `devforge-labs`; those repositories
  are not part of this project.
- The backend already separates CI, deployment, security, and catalog context
  behind TypeScript provider interfaces.
- `DEVFORGE_MOCK_MODE` defaults to true. With mock mode disabled, all health
  providers currently report unconfigured.
- `app-config.yaml` already declares the GitHub integration token as the
  backend-only `GITHUB_TOKEN` environment setting.

## Approaches considered

1. **On-demand backend REST provider (selected):** resolve the entity's repo
   from the Catalog, request the latest completed workflow run from GitHub, and
   map the result into the existing CI contract. This is small, uses no webhook
   service or new runtime dependency, and works for public repositories without
   credentials.
2. **Webhook ingestion and cached CI state:** more responsive and avoids
   repeated API calls, but requires durable event processing, storage, and
   webhook configuration that are unnecessary for this local portfolio demo.
3. **GitHub CLI subprocess:** unsuitable for a long-running backend and would
   couple portal behavior to a locally installed CLI and user session.

## Architecture and data flow

1. A health request arrives with a Component entity reference.
2. The backend uses the Backstage Catalog service and its own service
   credentials to load the entity.
3. In live mode, the CI provider reads `github.com/project-slug`, validates an
   `owner/repository` value, and accepts GitHub.com only.
4. The backend reads the GitHub.com integration token from Backstage root
   configuration. A token is optional for public repositories.
5. The backend requests the latest **completed** run from
   `GET /repos/{owner}/{repo}/actions/runs?status=completed&per_page=1`.
6. GitHub run results are mapped to the shared health DTO and returned through
   the existing service-health API. The credential never leaves the backend.

The frontend health extension will apply to `service` and `website` Components.
The portal catalog descriptor will point to `YouFoundTheDev/devforge`, allowing
the actual DevForge repository CI status to appear on the portal entity.
Illustrative service repository annotations remain unchanged.

## Provider behavior

The CI status contract remains unchanged:

| GitHub result | DevForge CI status | Score | Last run |
| --- | --- | --- | --- |
| Latest completed run has conclusion `success` | `PASSING` | 100 | GitHub run timestamp |
| Latest completed run has any other conclusion | `FAILING` | 0 | GitHub run timestamp |
| No completed runs, missing/invalid repository annotation, or unavailable repository | `UNAVAILABLE` | `null` | `null` |
| GitHub API/network failure | Partial health response with CI `UNAVAILABLE` and a generic CI source error | `null` | `null` |

The latest *completed* result is intentional: the shared API does not model an
active run. An in-progress run is not misrepresented as a pass or failure.

Mock mode continues to use fixed deterministic fixtures, including a portal
fixture, and continues to display `MOCK DATA`. Live mode uses the GitHub CI
provider and Catalog-backed context. It does not use demo deployment, security,
documentation, or dependency-health results:

- Deployment and security remain unavailable until real providers exist.
- Documentation health remains unavailable because a TechDocs annotation does
  not prove that a documentation build is currently available.
- Dependency names are read from Catalog relations, but their live health
  remains unavailable until health sources for those dependencies exist.
- The global source label is `live`; all unavailable dimensions remain
  explicitly visible and produce no fabricated score.

## Configuration and security

- Keep `DEVFORGE_MOCK_MODE=true` as the default.
- Keep using Backstage's `integrations.github` configuration; `GITHUB_TOKEN`
  remains backend-only and optional for public repositories.
- Document that private-repository reads require a token authorized to read
  Actions and repository metadata. A token also provides better GitHub API
  rate-limit headroom.
- Use GitHub's official REST API with JSON accept and API-version headers.
- Restrict repository resolution to the `github.com/project-slug` annotation
  and GitHub.com. Do not accept an arbitrary URL or host from the request.
- Apply a bounded request timeout. Do not log credentials, authorization
  headers, or raw GitHub error bodies. Surface provider failures as a generic
  CI-unavailable source error.
- Do not add a GitHub token to frontend config, DTOs, task output, or logs.
- No webhook, cache, database, new npm dependency, or GitHub CLI subprocess is
  in scope.

## Testing and acceptance criteria

- CI provider unit tests cover successful runs, non-success conclusions, no
  completed runs, malformed/missing repository annotations, GitHub errors,
  timeout behavior, optional public access, and configured backend
  authorization without exposing the token.
- Backend health tests prove live CI can return alongside unavailable
  deployment/security/docs/dependency health, with `dataSource: live` and an
  honest aggregate score/status.
- Frontend tests prove both service and website Components receive the health
  extension and the existing mock fixture is still shown as `MOCK DATA`.
- Strict Backstage config validation, plugin tests, workspace lint, typecheck,
  and production build pass.
- With mock mode disabled, a local authenticated health request for
  `component:default/devforge-portal` returns the latest completed CI result
  for `YouFoundTheDev/devforge`; mock mode continues to return deterministic
  data without requiring GitHub credentials.
- Generated or repository-level CI remains green after the change.

## Non-goals

- Live deployment, security, dependency-health, or TechDocs availability
  providers.
- GitHub Enterprise or non-GitHub SCM hosts.
- Active workflow-run status, workflow selection, branch filtering, webhooks,
  cached results, or aggregate CI success-rate analytics.
- Changes to the existing service-health API shape.
