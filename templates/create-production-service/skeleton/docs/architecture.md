# Architecture

The service uses a small Express application with a route handler for health
checks. `src/server.ts` composes the application, while `src/routes/health.ts`
owns the `/health` response. Tests exercise the HTTP endpoint over an ephemeral
local port.

The selected database is recorded in the catalog descriptor as a dependency;
the starter does not provision or connect to a database.
