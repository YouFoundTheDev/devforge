# Threat Intelligence API

The threat-intel service enriches indicators with reputation and threat context.
It is owned by the security team and exposes the `threat-intel-v1` API.

## Dependencies

The catalog records PostgreSQL and Redis as backing resources. The incident
analysis service consumes the threat-intel API for investigation enrichment.

## Operations

Use the Service Health tab in the DevForge demo to review deterministic CI,
deployment, security, dependency, and documentation fixtures for this service.
The sample values illustrate the provider contract and are not live telemetry.
