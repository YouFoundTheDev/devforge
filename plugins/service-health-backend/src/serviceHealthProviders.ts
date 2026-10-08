import type {
  DeploymentHealth,
  SecurityHealth,
} from '@internal/plugin-service-health-common';
import {
  DemoCiProvider,
  DemoDeploymentProvider,
  DemoSecurityProvider,
  DemoServiceContextProvider,
} from './demoProviders';
import type { CatalogEntityLookup } from './catalogEntityLookup';
import { CatalogServiceContextProvider } from './catalogServiceContextProvider';
import { GitHubActionsCiProvider } from './githubActionsCiProvider';
import type { ServiceHealthProviders } from './healthAggregator';
import { HealthProviderNotConfiguredError } from './providers';

class UnconfiguredSignalProvider {
  async getDeploymentHealth(_entityRef: string): Promise<DeploymentHealth> {
    throw new HealthProviderNotConfiguredError('Deployment');
  }

  async getSecurityHealth(_entityRef: string): Promise<SecurityHealth> {
    throw new HealthProviderNotConfiguredError('Security');
  }
}

interface LiveProviderOptions {
  lookupEntity: CatalogEntityLookup;
  githubToken?: string;
  fetchApi?: typeof fetch;
}

export function createServiceHealthProviders(
  mockMode: true,
): ServiceHealthProviders;
export function createServiceHealthProviders(
  mockMode: false,
  liveOptions: LiveProviderOptions,
): ServiceHealthProviders;
export function createServiceHealthProviders(
  mockMode: boolean,
  liveOptions?: LiveProviderOptions,
): ServiceHealthProviders {
  if (mockMode) {
    return {
      ci: new DemoCiProvider(),
      deployment: new DemoDeploymentProvider(),
      security: new DemoSecurityProvider(),
      context: new DemoServiceContextProvider(),
      dataSource: 'demo',
    };
  }

  if (!liveOptions) {
    throw new Error(
      'Live service health requires Catalog-backed provider options.',
    );
  }

  const unconfigured = new UnconfiguredSignalProvider();
  return {
    ci: new GitHubActionsCiProvider(liveOptions.lookupEntity, {
      token: liveOptions.githubToken,
      fetchApi: liveOptions.fetchApi,
    }),
    deployment: unconfigured,
    security: unconfigured,
    context: new CatalogServiceContextProvider(liveOptions.lookupEntity),
    dataSource: 'live',
  };
}
