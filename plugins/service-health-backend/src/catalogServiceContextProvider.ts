import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import type {
  DependencyHealth,
  DocumentationHealth,
} from '@internal/plugin-service-health-common';
import type { CatalogEntityLookup } from './catalogEntityLookup';
import { UnknownServiceEntityError } from './providers';
import type { ServiceContextProvider } from './providers';

const unavailableDocumentation: DocumentationHealth = {
  status: 'UNAVAILABLE',
  score: null,
};

function displayName(entityRef: string): string {
  const name = parseEntityRef(entityRef).name;
  if (name.toLowerCase() === 'postgresql') {
    return 'PostgreSQL';
  }
  return name
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export class CatalogServiceContextProvider implements ServiceContextProvider {
  constructor(private readonly lookupEntity: CatalogEntityLookup) {}

  async getDocumentationHealth(
    entityRef: string,
  ): Promise<DocumentationHealth> {
    const entity = await this.lookupEntity(entityRef);
    if (!entity) {
      throw new UnknownServiceEntityError(entityRef);
    }
    return unavailableDocumentation;
  }

  async getDependencyHealth(entityRef: string): Promise<DependencyHealth[]> {
    const entity = await this.lookupEntity(entityRef);
    if (!entity) {
      throw new UnknownServiceEntityError(entityRef);
    }

    const dependencies = entity.spec?.dependsOn;
    if (!Array.isArray(dependencies)) {
      return [];
    }

    return dependencies
      .filter(
        (dependency): dependency is string => typeof dependency === 'string',
      )
      .map(dependency => {
        const ref = stringifyEntityRef(
          parseEntityRef(dependency, {
            defaultKind: 'Component',
            defaultNamespace: entity.metadata.namespace ?? 'default',
          }),
        );
        return {
          entityRef: ref,
          name: displayName(ref),
          status: 'UNAVAILABLE',
        };
      });
  }
}
