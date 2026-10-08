import type {
  CiHealth,
  DeploymentHealth,
  SecurityHealth,
} from '@internal/plugin-service-health-common';
import {
  DemoCiProvider,
  DemoDeploymentProvider,
  DemoSecurityProvider,
  DemoServiceContextProvider,
} from './demoProviders';
import type { ServiceHealthProviders } from './healthAggregator';
import { HealthProviderNotConfiguredError } from './providers';

class UnconfiguredSignalProvider {
  async getCiHealth(_entityRef: string): Promise<CiHealth> {
    throw new HealthProviderNotConfiguredError('CI');
  }

  async getDeploymentHealth(_entityRef: string): Promise<DeploymentHealth> {
    throw new HealthProviderNotConfiguredError('Deployment');
  }

  async getSecurityHealth(_entityRef: string): Promise<SecurityHealth> {
    throw new HealthProviderNotConfiguredError('Security');
  }
}

export function createServiceHealthProviders(
  mockMode: boolean,
): ServiceHealthProviders {
  const context = new DemoServiceContextProvider();

  if (mockMode) {
    return {
      ci: new DemoCiProvider(),
      deployment: new DemoDeploymentProvider(),
      security: new DemoSecurityProvider(),
      context,
    };
  }

  const unconfigured = new UnconfiguredSignalProvider();
  return {
    ci: unconfigured,
    deployment: unconfigured,
    security: unconfigured,
    context,
  };
}
