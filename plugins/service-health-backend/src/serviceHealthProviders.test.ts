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
    const providers = createServiceHealthProviders(false, {
      lookupEntity: jest.fn().mockResolvedValue(entity),
      fetchApi: jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockImplementation(
          async () =>
            new Response(
              JSON.stringify({
                total_count: 0,
                workflow_runs: [],
              }),
              { status: 200 },
            ),
        ),
    });

    await expect(
      providers.ci.getCiHealth('component:default/threat-intel-api'),
    ).resolves.toMatchObject({ status: 'UNAVAILABLE', score: null });
    await expect(
      providers.deployment.getDeploymentHealth(
        'component:default/threat-intel-api',
      ),
    ).rejects.toThrow('Deployment provider is not configured.');
    await expect(
      providers.security.getSecurityHealth(
        'component:default/threat-intel-api',
      ),
    ).rejects.toThrow('Security provider is not configured.');
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
