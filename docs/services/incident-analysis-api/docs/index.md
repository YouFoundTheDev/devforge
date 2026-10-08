# Incident Analysis API

The incident-analysis service helps security teams enrich and triage
investigations. It exposes the `incident-analysis-v1` API and consumes
`threat-intel-v1`.

## Dependencies

The Software Catalog models the service dependency on Threat Intelligence API
and PostgreSQL. Ownership and these relations are maintained in its
`catalog-info.yaml` descriptor.

## Operations

The DevForge health panel uses deterministic demo signals. Replace the backend
providers with deployment and CI adapters before using the view for operational
decisions.
