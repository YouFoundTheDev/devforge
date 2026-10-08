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
  });

  it('fails explicitly when live provider adapters are not configured', async () => {
    const providers = createServiceHealthProviders(false);

    await expect(
      providers.ci.getCiHealth('component:default/threat-intel-api'),
    ).rejects.toThrow('CI provider is not configured.');
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
  });
});
