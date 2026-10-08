# DevForge Phase 2: Service Health Plugin Design

## Intent and success criteria

Build the most important DevForge portfolio feature as a real Backstage plugin:
a service health panel on service entity pages, backed by a backend API and
provider interfaces. The feature must demonstrate Backstage plugin development
without putting provider logic or credentials in the browser.

Phase 2 is complete when a developer can open a service entity in the local
portal and see its deterministic health summary, component signals, dependencies,
and recent deployments. The frontend and backend are independently testable,
and a provider failure is visible rather than converted to success-shaped data.

## Scope

### Included

- Add a shared contract package, a frontend plugin package, and a backend
  plugin package under the Backstage workspace.
- Register the frontend feature in the existing new frontend system app and the
  backend feature in the existing backend system.
- Use Backstage 1.55's Catalog `EntityContentBlueprint` to add a
  **Service Health** entity page view filtered to `Component` entities whose
  `spec.type` is `service`.
- Fetch health through the Backstage-discovered service-health backend API.
- Define separate backend interfaces for CI, deployment, and security data.
- Provide deterministic, entity-keyed demo adapters so the end-to-end feature
  works before Phase 3 adds mock-mode selection.
- Include deterministic demo data for the current service entities; the
  `threat-intel-api` view matches the requested 94/100 sample.
- Render overall health, CI, deployment, security, documentation, dependency
  state, version/environment/deployment time, and recent deployments.
- Include responsive loading, explicit error/retry, and no-data states.
- Keep API response types in a small shared package used by both plugins.

### Deferred

The `DEVFORGE_MOCK_MODE` configuration switch and visible mock-data indicator,
real CI/deployment/security integrations, Golden Path, GitHub publishing,
TechDocs authoring, security scanning, and platform dashboard belong to later
phases.

## Architecture and data flow

Workspace packages:

- `plugins/service-health-common`: client-safe health response and status
  types.
- `plugins/service-health`: frontend entity content extension and API client.
- `plugins/service-health-backend`: backend route, aggregation, scoring, and
  provider interfaces/adapters.

The extension is registered as a Backstage frontend feature and attaches to the
Catalog entity content surface only when `entity.kind` is `Component` and
`entity.spec.type` is `service`. It uses Backstage API discovery/fetch APIs and
passes the current component entity reference to the backend.

The backend plugin exposes `GET /api/service-health/v1?entityRef=<encoded
entity-ref>`. It validates the entity reference, calls the CI, deployment, and
security provider interfaces, and composes their results with dependency and
documentation values from the entity-keyed demo fixture into the shared
response contract. Providers receive the entity reference and own all
data-source behavior. The fixture registry recognizes the current service
entities; unknown references return 404. The browser receives only the
resulting health DTO; it never receives provider credentials.

The backend package initially includes deterministic demo adapters keyed by
entity reference. Phase 3 will select fixture adapters through
`DEVFORGE_MOCK_MODE=true` and add an explicit demo-data label without changing
the client contract.

## Response and scoring contract

The response contains:

- Entity reference and overall `HEALTHY`, `DEGRADED`, or `CRITICAL` status.
- Nullable overall score from 0 to 100.
- Data source (`demo` in Phase 2, extended by Phase 3 without changing the
  response shape).
- CI status and score.
- Deployment status, version, environment, last deployment time, and recent
  deployment records.
- Security status, score, critical/high/medium/secrets counts, SAST status, and
  container scan status.
- Documentation completeness/status.
- Dependency entity references and health statuses.
- Source errors when the response is partial.

Overall score is nullable and otherwise the rounded arithmetic mean of the CI,
deployment, security, and documentation scores. The `threat-intel-api` fixture
uses 100, 90, 94, and 92 respectively, producing 94. If one of those scores is
unavailable, the overall score is null rather than a fabricated partial score.
Dependency health affects overall status but is not double-counted in the
numeric score. Overall status follows the most severe subsystem status
(`CRITICAL` before `DEGRADED` before `HEALTHY`). The security provider reports
gate status separately from finding counts, allowing the sample to pass with
non-critical findings while still showing critical 0, high 1, medium 2, and
secrets 0.

## Error handling

- Invalid entity references return HTTP 400; unknown entities return HTTP 404.
- Partial provider failures produce an explicit `DEGRADED` response with
  source-specific errors and no fabricated values.
- If the backend cannot produce any useful provider data, it returns an
  explicit service error rather than a success-shaped fallback.
- The frontend shows loading, error with retry, and no-data states.
- Do not catch and suppress provider errors, leak credentials, or log tokens.

## Validation and testing

- Backend unit tests cover the score formula, the expected 94 score, status
  precedence, and provider failure behavior.
- Backend API tests cover valid aggregation, malformed references, not-found
  entities, and partial/all-provider failures.
- Frontend tests cover the exact healthy sample, service-only filtering,
  loading, and retryable errors.
- Run workspace lint, typecheck, tests, and build.
- Start the local Backstage app and verify the panel is present on
  `threat-intel-api`, shows the expected values, and is absent on the portal and
  library entities.

## Constraints and assumptions

- Use APIs from the installed Backstage 1.55 dependency set. Its Catalog plugin
  exposes `EntityContentBlueprint`; its backend plugin API exposes
  `createBackendPlugin`.
- No external service, token, or GitHub credential is required for Phase 2.
- Demo values are deterministic and keyed by entity reference.
- This phase establishes the provider seam; Phase 3 owns explicit mock-mode
  selection and labeling.
- The health panel is a portfolio/reference feature, not a production SLO
  monitor.
