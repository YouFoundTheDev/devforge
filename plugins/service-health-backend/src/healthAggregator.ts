import {
  serviceHealthResponseSchema,
  type CiHealth,
  type DeploymentHealth,
  type SecurityHealth,
  type ServiceHealthResponse,
} from '@internal/plugin-service-health-common';
import {
  HealthProvidersUnavailableError,
  type CiProvider,
  type DeploymentProvider,
  type SecurityProvider,
  type ServiceContextProvider,
} from './providers';

export interface ServiceHealthProviders {
  ci: CiProvider;
  deployment: DeploymentProvider;
  security: SecurityProvider;
  context: ServiceContextProvider;
}

export interface ServiceHealthReader {
  getHealth(entityRef: string): Promise<ServiceHealthResponse>;
}

export function calculateHealthScore(
  scores: Array<number | null>,
): number | null {
  if (scores.length === 0 || scores.some(score => score === null)) {
    return null;
  }
  return Math.round(
    scores.reduce<number>((sum, score) => sum + (score ?? 0), 0) /
      scores.length,
  );
}

function calculateOverallStatus(
  ci: CiHealth,
  deployment: DeploymentHealth,
  security: SecurityHealth,
  documentation: ServiceHealthResponse['documentation'],
  dependencies: ServiceHealthResponse['dependencies'],
): ServiceHealthResponse['status'] {
  if (
    ci.status === 'FAILING' ||
    deployment.status === 'UNHEALTHY' ||
    security.status === 'FAILING' ||
    (security.findings.critical !== null && security.findings.critical > 0) ||
    dependencies.some(dependency => dependency.status === 'UNHEALTHY')
  ) {
    return 'CRITICAL';
  }

  if (
    ci.status === 'UNAVAILABLE' ||
    deployment.status === 'UNAVAILABLE' ||
    security.status === 'UNAVAILABLE' ||
    documentation.status !== 'COMPLETE' ||
    dependencies.some(dependency => dependency.status === 'UNAVAILABLE')
  ) {
    return 'DEGRADED';
  }

  return 'HEALTHY';
}

function getProviderValue<T>(
  result: PromiseSettledResult<T>,
  unavailable: T,
  provider: string,
  sourceErrors: ServiceHealthResponse['sourceErrors'],
): T {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  sourceErrors.push({
    provider,
    message: `${provider} data is temporarily unavailable.`,
  });
  return unavailable;
}

export class ServiceHealthAggregator implements ServiceHealthReader {
  constructor(private readonly providers: ServiceHealthProviders) {}

  async getHealth(entityRef: string): Promise<ServiceHealthResponse> {
    const [documentation, dependencies] = await Promise.all([
      this.providers.context.getDocumentationHealth(entityRef),
      this.providers.context.getDependencyHealth(entityRef),
    ]);
    const results = await Promise.allSettled([
      this.providers.ci.getCiHealth(entityRef),
      this.providers.deployment.getDeploymentHealth(entityRef),
      this.providers.security.getSecurityHealth(entityRef),
    ] as const);

    if (results.every(result => result.status === 'rejected')) {
      throw new HealthProvidersUnavailableError();
    }

    const sourceErrors: ServiceHealthResponse['sourceErrors'] = [];
    const ci = getProviderValue(
      results[0],
      { status: 'UNAVAILABLE', score: null, lastRun: null },
      'CI',
      sourceErrors,
    );
    const deployment = getProviderValue(
      results[1],
      {
        status: 'UNAVAILABLE',
        score: null,
        version: null,
        environment: null,
        lastDeployment: null,
        recentDeployments: [],
      },
      'Deployment',
      sourceErrors,
    );
    const security = getProviderValue(
      results[2],
      {
        status: 'UNAVAILABLE',
        score: null,
        findings: { critical: null, high: null, medium: null, secrets: null },
        sast: 'UNAVAILABLE',
        containerScan: 'UNAVAILABLE',
      },
      'Security',
      sourceErrors,
    );

    return serviceHealthResponseSchema.parse({
      entityRef,
      status: calculateOverallStatus(
        ci,
        deployment,
        security,
        documentation,
        dependencies,
      ),
      score: calculateHealthScore([
        ci.score,
        deployment.score,
        security.score,
        documentation.score,
      ]),
      dataSource: 'demo',
      ci,
      deployment,
      security,
      documentation,
      dependencies,
      sourceErrors,
    });
  }
}
