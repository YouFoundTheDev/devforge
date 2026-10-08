import type { Entity } from '@backstage/catalog-model';

export function isHealthEntity(entity: Entity): boolean {
  return (
    entity.kind === 'Component' &&
    (entity.spec?.type === 'service' || entity.spec?.type === 'website')
  );
}
