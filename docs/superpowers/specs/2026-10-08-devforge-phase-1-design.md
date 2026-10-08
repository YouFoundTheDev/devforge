# DevForge Phase 1: Backstage and Catalog Design

## Intent and success criteria

DevForge is a portfolio/reference implementation demonstrating Backstage,
platform engineering, developer experience, and DevSecOps skills. The project
must remain approachable to run locally and must not imply production usage.

Phase 1 establishes the official Backstage app foundation and a realistic,
locally loaded Software Catalog. It is complete when the app starts locally,
the expected entities are visible, and their ownership, system, API, and
dependency relations resolve in the Catalog.

## Scope

### Included

- Generate a standard Backstage application using the official
  `@backstage/create-app` scaffold.
- Inspect and record the scaffolded Backstage version before choosing any
  version-sensitive Backstage APIs or configuration. The generated app is
  Backstage `1.55.0`.
- Add catalog YAML for:
  - System: `devforge-platform`.
  - Components: `devforge-portal`, `service-health-plugin`,
    `threat-intel-api`, `incident-analysis-api`, and `identity-service`.
  - Resources: PostgreSQL and Redis.
  - Groups: `platform-team`, `security-team`, and `backend-team`.
- Add API entities where needed to model component API production and
  consumption as standard Catalog relations.
- Configure the app to ingest local catalog YAML without GitHub credentials or
  other external services.
- Represent ownership, lifecycle, component type, technology, repository,
  dependencies, APIs, and documentation references in component metadata.
- Use realistic platform-engineering and cybersecurity descriptions and
  relationships.

### Deferred

Custom frontend/backend plugins, provider integrations, health scoring,
Scaffolder templates, GitHub publishing and CI, TechDocs rendering, security
scanning, dashboard polish, screenshots, and final project documentation belong
to later implementation phases.

## Architecture and data flow

The generated Backstage app uses the standard app, backend, and package layout
from the official scaffold. The Catalog backend reads checked-in local entity
descriptors through the local file configuration supported by the scaffolded
Backstage version. The frontend uses the standard Catalog pages and entity
views.

Catalog descriptors form a connected graph. All owner, system, API, resource,
and component references must resolve to entities supplied in the demo. The
DevForge system groups the platform components; component relations express
ownership, dependencies, and provided/consumed APIs. API definitions use
Backstage Catalog API entities rather than free-form relation labels.

Repository metadata identifies the intended GitHub project slug as a
reference. It does not require the repository to exist or credentials to be
configured. Documentation references are metadata for the later TechDocs
phase; Phase 1 does not claim that TechDocs has been configured or rendered.

## Catalog data conventions

- Use standard Backstage entity kinds and supported fields for the scaffolded
  version.
- Use stable, lowercase entity names matching the identifiers in this design.
- Set production lifecycle on example services and select owners from the
  included groups.
- Add technology and repository information as entity metadata/annotations.
- Model PostgreSQL and Redis as `Resource` entities and service dependencies
  with standard `dependsOn` references.
- Keep documentation links/references explicit and consistent with the later
  TechDocs layout; do not create misleading external integrations.

## Validation and error handling

- Confirm the installed Backstage version from the scaffolded dependency
  manifests before adding version-sensitive configuration.
- Keep the upstream Yarn `got` patch required by this scaffold in
  `.yarn/patches/` so clean installs can resolve the generated dependency set;
  document its upstream origin and license in the project notices.
- Validate entity YAML and Catalog reference resolution using the catalog
  validation tooling available in that installed version.
- Run the scaffold's relevant lint, typecheck, test, and build commands.
- Start the app locally and verify the expected entity set and relations in the
  Catalog UI.
- Treat invalid YAML, unsupported fields, and unresolved references as
  failures to fix; do not silently fall back to incomplete catalog data.

## Constraints and assumptions

- Phase 1 follows the official create-app conventions and is intentionally
  limited to the Backstage foundation and catalog.
- The workspace is currently empty and is not a Git repository.
- Local operation must not depend on GitHub credentials.
- Any remote repository links are illustrative metadata only.
- Later phases may extend entity metadata and add TechDocs content while
  preserving this entity graph.

## Design decision

Use the official Backstage scaffold instead of manually assembling a
multi-package workspace. It minimizes setup risk, follows supported project
conventions, and provides a runnable baseline for the subsequent plugin and
Scaffolder work. Keep Catalog entities as checked-in local YAML so the initial
demo is deterministic and works offline after dependencies are installed.
