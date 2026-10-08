# Service Health Plugin

The `service-health` plugin adds a service health view to Backstage service
Components. A typed backend API aggregates CI, deployment, security,
documentation, and dependency signals.

## Health view

The UI presents an overall status and score, source-specific status, recent
deployments, and dependency health. Partial provider failures are surfaced so
an unavailable source is not reported as a successful check.

## Provider model

CI, deployment, and security providers implement small TypeScript interfaces.
Deterministic fixtures power the local demo; live adapters can replace them
without moving integration logic into the frontend.
