import type { Entity } from '@backstage/catalog-model';
import { createServiceHealthProviders } from './serviceHealthProviders';

describe('createServiceHealthProviders', () => {
  it('uses deterministic demo providers when mock mode is enabled', async () => {
    const providers = createServiceHealthProviders(true);

    await expect(
      providers.ci.getCiHealth('component:default/threat-intel-api'),
    ).resolves.toMatchObject({ status: 'PASSING', score: 100 });
    await expect(
      providers.deployment.getDeploymentHealth(
        'component:default/threat-intel-api',
      ),
    ).resolves.toMatchObject({ version: 'v1.4.2' });
    expect(providers.dataSource).toBe('demo');
  });

  it('uses GitHub Actions and Catalog context in live mode', async () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'threat-intel-api',
        annotations: { 'github.com/project-slug': 'YouFoundTheDev/devforge' },
      },
      spec: {
        type: 'service',
        dependsOn: ['resource:default/postgresql'],
      },
    };
    const fetchApi = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(async input => {
        const url = String(input);
        return new Response(
          JSON.stringify(
            url.includes('/actions/runs?')
              ? {
                  total_count: 1,
                  workflow_runs: [
                    {
                      id: 42,
                      status: 'completed',
                      conclusion: 'success',
                      updated_at: '2026-10-08T12:30:00Z',
                    },
                  ],
                }
              : {
                  total_count: 1,
                  jobs: [
                    {
                      steps: [
                        { name: 'Dependency audit', conclusion: 'success' },
                        { name: 'Scan container', conclusion: 'success' },
                      ],
                    },
                  ],
                },
          ),
          { status: 200 },
        );
      });
    const providers = createServiceHealthProviders(false, {
      lookupEntity: jest.fn().mockResolvedValue(entity),
      fetchApi,
    });

    const [ci, security] = await Promise.all([
      providers.ci.getCiHealth('component:default/threat-intel-api'),
      providers.security.getSecurityHealth(
        'component:default/threat-intel-api',
      ),
    ]);
    expect(ci).toMatchObject({ status: 'PASSING', score: 100 });
    expect(security).toMatchObject({
      status: 'PASSING',
      dependencyAudit: 'PASS',
      containerScan: 'PASS',
    });
    expect(fetchApi).toHaveBeenCalledTimes(2);
    expect(
      fetchApi.mock.calls.filter(([input]) =>
        String(input).includes('/actions/runs?'),
      ),
    ).toHaveLength(1);
    await expect(
      providers.deployment.getDeploymentHealth(
        'component:default/threat-intel-api',
      ),
    ).rejects.toThrow('Deployment provider is not configured.');
    await expect(
      providers.context.getDependencyHealth(
        'component:default/threat-intel-api',
      ),
    ).resolves.toEqual([
      {
        entityRef: 'resource:default/postgresql',
        name: 'PostgreSQL',
        status: 'UNAVAILABLE',
      },
    ]);
    expect(providers.dataSource).toBe('live');
  });
});
