import type {
  CiHealth,
  DependencyHealth,
  DeploymentHealth,
  DocumentationHealth,
  SecurityHealth,
} from '@internal/plugin-service-health-common';
import {
  UnknownServiceEntityError,
  type CiProvider,
  type DeploymentProvider,
  type SecurityProvider,
  type ServiceContextProvider,
} from './providers';

interface DemoFixture {
  ci: CiHealth;
  deployment: DeploymentHealth;
  security: SecurityHealth;
  documentation: DocumentationHealth;
  dependencies: DependencyHealth[];
}

const fixtures: Record<string, DemoFixture> = {
  'component:default/threat-intel-api': {
    ci: {
      status: 'PASSING',
      score: 100,
      lastRun: '5 minutes ago',
    },
    deployment: {
      status: 'HEALTHY',
      score: 90,
      version: 'v1.4.2',
      environment: 'production',
      lastDeployment: '10 minutes ago',
      recentDeployments: [
        { version: 'v1.4.2', status: 'SUCCESS' },
        { version: 'v1.4.1', status: 'SUCCESS' },
        { version: 'v1.4.0', status: 'SUCCESS' },
      ],
    },
    security: {
      status: 'PASSING',
      score: 94,
      findings: { critical: 0, high: 1, medium: 2, secrets: 0 },
      sast: 'PASS',
      containerScan: 'PASS',
    },
    documentation: {
      status: 'COMPLETE',
      score: 92,
    },
    dependencies: [
      {
        entityRef: 'component:default/identity-service',
        name: 'identity-service',
        status: 'HEALTHY',
      },
      {
        entityRef: 'resource:default/postgresql',
        name: 'PostgreSQL',
        status: 'HEALTHY',
      },
      {
        entityRef: 'resource:default/redis',
        name: 'Redis',
        status: 'HEALTHY',
      },
    ],
  },
  'component:default/incident-analysis-api': {
    ci: { status: 'PASSING', score: 96, lastRun: '2 minutes ago' },
    deployment: {
      status: 'HEALTHY',
      score: 92,
      version: 'v2.1.0',
      environment: 'production',
      lastDeployment: '18 minutes ago',
      recentDeployments: [
        { version: 'v2.1.0', status: 'SUCCESS' },
        { version: 'v2.0.4', status: 'SUCCESS' },
        { version: 'v2.0.3', status: 'SUCCESS' },
      ],
    },
    security: {
      status: 'PASSING',
      score: 94,
      findings: { critical: 0, high: 0, medium: 1, secrets: 0 },
      sast: 'PASS',
      containerScan: 'PASS',
    },
    documentation: { status: 'COMPLETE', score: 94 },
    dependencies: [
      {
        entityRef: 'component:default/threat-intel-api',
        name: 'threat-intel-api',
        status: 'HEALTHY',
      },
      {
        entityRef: 'resource:default/postgresql',
        name: 'PostgreSQL',
        status: 'HEALTHY',
      },
    ],
  },
  'component:default/identity-service': {
    ci: { status: 'PASSING', score: 98, lastRun: '3 minutes ago' },
    deployment: {
      status: 'HEALTHY',
      score: 96,
      version: 'v3.0.1',
      environment: 'production',
      lastDeployment: '30 minutes ago',
      recentDeployments: [
        { version: 'v3.0.1', status: 'SUCCESS' },
        { version: 'v3.0.0', status: 'SUCCESS' },
        { version: 'v2.9.8', status: 'SUCCESS' },
      ],
    },
    security: {
      status: 'PASSING',
      score: 97,
      findings: { critical: 0, high: 0, medium: 0, secrets: 0 },
      sast: 'PASS',
      containerScan: 'PASS',
    },
    documentation: { status: 'COMPLETE', score: 95 },
    dependencies: [
      {
        entityRef: 'resource:default/postgresql',
        name: 'PostgreSQL',
        status: 'HEALTHY',
      },
    ],
  },
};

function getFixture(entityRef: string): DemoFixture {
  const fixture = fixtures[entityRef];
  if (!fixture) {
    throw new UnknownServiceEntityError(entityRef);
  }
  return fixture;
}

export class DemoCiProvider implements CiProvider {
  async getCiHealth(entityRef: string): Promise<CiHealth> {
    return getFixture(entityRef).ci;
  }
}

export class DemoDeploymentProvider implements DeploymentProvider {
  async getDeploymentHealth(entityRef: string): Promise<DeploymentHealth> {
    return getFixture(entityRef).deployment;
  }
}

export class DemoSecurityProvider implements SecurityProvider {
  async getSecurityHealth(entityRef: string): Promise<SecurityHealth> {
    return getFixture(entityRef).security;
  }
}

export class DemoServiceContextProvider implements ServiceContextProvider {
  async getDocumentationHealth(
    entityRef: string,
  ): Promise<DocumentationHealth> {
    return getFixture(entityRef).documentation;
  }

  async getDependencyHealth(entityRef: string): Promise<DependencyHealth[]> {
    return getFixture(entityRef).dependencies;
  }
}
