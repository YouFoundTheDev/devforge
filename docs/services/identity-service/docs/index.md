# Identity Service

The identity service provides shared user and service identity capabilities.
It is owned by the backend team, exposes `identity-v1`, and is modeled as a
dependency of the service-health plugin.

## Catalog ownership

The component descriptor associates the service with the DevForge Platform
system and records PostgreSQL as a backing resource.

## Demo health

The local health provider reports fixed sample values so the portal can be
explored without an external deployment or credentials.
