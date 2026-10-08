import {
  ServiceHealthAggregator,
  calculateHealthScore,
} from './healthAggregator';
import {
  DemoCiProvider,
  DemoDeploymentProvider,
  DemoSecurityProvider,
  DemoServiceContextProvider,
} from './demoProviders';
import type {
  CiProvider,
  DeploymentProvider,
  SecurityProvider,
} from './providers';

describe('calculateHealthScore', () => {
  it('returns the rounded mean of all available signals', () => {
    expect(calculateHealthScore([100, 90, 94, 92])).toBe(94);
  });

  it('does not fabricate a score when a signal is unavailable', () => {
    expect(calculateHealthScore([100, null, 94, 92])).toBeNull();
  });
});

describe('ServiceHealthAggregator', () => {
  const entityRef = 'component:default/threat-intel-api';

  it('aggregates deterministic provider data for the service entity', async () => {
    const aggregator = new ServiceHealthAggregator({
      ci: new DemoCiProvider(),
      deployment: new DemoDeploymentProvider(),
      security: new DemoSecurityProvider(),
      context: new DemoServiceContextProvider(),
    });

    await expect(aggregator.getHealth(entityRef)).resolves.toMatchObject({
      entityRef,
      status: 'HEALTHY',
      score: 94,
      dataSource: 'demo',
      deployment: {
        version: 'v1.4.2',
        environment: 'production',
        lastDeployment: '10 minutes ago',
      },
      security: {
        score: 94,
        findings: { critical: 0, high: 1, medium: 2, secrets: 0 },
      },
      dependencies: [
        { name: 'identity-service', status: 'HEALTHY' },
        { name: 'PostgreSQL', status: 'HEALTHY' },
        { name: 'Redis', status: 'HEALTHY' },
      ],
    });
  });

  it('returns an explicit degraded response when one provider fails', async () => {
    const ci: CiProvider = {
      getCiHealth: jest.fn().mockRejectedValue(new Error('provider timeout')),
    };
    const aggregator = new ServiceHealthAggregator({
      ci,
      deployment: new DemoDeploymentProvider(),
      security: new DemoSecurityProvider(),
      context: new DemoServiceContextProvider(),
    });

    await expect(aggregator.getHealth(entityRef)).resolves.toMatchObject({
      status: 'DEGRADED',
      score: null,
      ci: { status: 'UNAVAILABLE', score: null },
      sourceErrors: [{ provider: 'CI' }],
    });
  });

  it('does not classify an unavailable security provider as critical', async () => {
    const security: SecurityProvider = {
      getSecurityHealth: jest
        .fn()
        .mockRejectedValue(new Error('provider timeout')),
    };
    const aggregator = new ServiceHealthAggregator({
      ci: new DemoCiProvider(),
      deployment: new DemoDeploymentProvider(),
      security,
      context: new DemoServiceContextProvider(),
    });

    await expect(aggregator.getHealth(entityRef)).resolves.toMatchObject({
      status: 'DEGRADED',
      security: {
        status: 'UNAVAILABLE',
        findings: { critical: null },
      },
    });
  });

  it('returns partial live health when only GitHub CI is configured', async () => {
    const aggregator = new ServiceHealthAggregator({
      ci: {
        getCiHealth: async () => ({
          status: 'PASSING',
          score: 100,
          lastRun: '2026-10-08T12:00:00.000Z',
        }),
      },
      deployment: {
        getDeploymentHealth: async () => {
          throw new Error('not configured');
        },
      },
      security: {
        getSecurityHealth: async () => {
          throw new Error('not configured');
        },
      },
      context: {
        getDocumentationHealth: async () => ({
          status: 'UNAVAILABLE',
          score: null,
        }),
        getDependencyHealth: async () => [],
      },
      dataSource: 'live',
    });

    await expect(aggregator.getHealth(entityRef)).resolves.toMatchObject({
      dataSource: 'live',
      status: 'DEGRADED',
      ci: { status: 'PASSING', score: 100 },
      deployment: { status: 'UNAVAILABLE' },
      security: { status: 'UNAVAILABLE' },
      documentation: { status: 'UNAVAILABLE' },
      sourceErrors: [{ provider: 'Deployment' }, { provider: 'Security' }],
    });
  });

  it('fails explicitly when all signal providers fail', async () => {
    const unavailable = () => Promise.reject(new Error('offline'));
    const deployment: DeploymentProvider = {
      getDeploymentHealth: unavailable,
    };
    const security: SecurityProvider = {
      getSecurityHealth: unavailable,
    };
    const ci: CiProvider = { getCiHealth: unavailable };
    const aggregator = new ServiceHealthAggregator({
      ci,
      deployment,
      security,
      context: new DemoServiceContextProvider(),
    });

    await expect(aggregator.getHealth(entityRef)).rejects.toThrow(
      'All service health providers are unavailable',
    );
  });
});
