import type { AuthService } from '@backstage/backend-plugin-api';
import type { Entity } from '@backstage/catalog-model';
import type { CatalogService } from '@backstage/plugin-catalog-node';

export type CatalogEntityLookup = (
  entityRef: string,
) => Promise<Entity | undefined>;

export function createCatalogEntityLookup(
  catalog: CatalogService,
  auth: Pick<AuthService, 'getOwnServiceCredentials'>,
): CatalogEntityLookup {
  const pending = new Map<string, Promise<Entity | undefined>>();

  return entityRef => {
    const existing = pending.get(entityRef);
    if (existing) {
      return existing;
    }

    const lookup = (async () => {
      const credentials = await auth.getOwnServiceCredentials();
      return catalog.getEntityByRef(entityRef, { credentials });
    })();

    pending.set(entityRef, lookup);
    void lookup.then(
      () => pending.delete(entityRef),
      () => pending.delete(entityRef),
    );
    return lookup;
  };
}
