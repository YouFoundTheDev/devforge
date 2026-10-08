import type {
  CiHealth,
  DependencyHealth,
  DeploymentHealth,
  DocumentationHealth,
  SecurityHealth,
} from '@internal/plugin-service-health-common';

export interface CiProvider {
  getCiHealth(entityRef: string): Promise<CiHealth>;
}

export interface DeploymentProvider {
  getDeploymentHealth(entityRef: string): Promise<DeploymentHealth>;
}

export interface SecurityProvider {
  getSecurityHealth(entityRef: string): Promise<SecurityHealth>;
}

export interface ServiceContextProvider {
  getDocumentationHealth(entityRef: string): Promise<DocumentationHealth>;
  getDependencyHealth(entityRef: string): Promise<DependencyHealth[]>;
}

export class UnknownServiceEntityError extends Error {
  constructor(entityRef: string) {
    super(`No service health data exists for ${entityRef}`);
    this.name = 'UnknownServiceEntityError';
  }
}

export class HealthProvidersUnavailableError extends Error {
  constructor() {
    super('All service health providers are unavailable');
    this.name = 'HealthProvidersUnavailableError';
  }
}

export class HealthProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} provider is not configured.`);
    this.name = 'HealthProviderNotConfiguredError';
  }
}
