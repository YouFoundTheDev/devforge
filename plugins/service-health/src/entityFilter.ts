import type { Entity } from '@backstage/catalog-model';

export function isServiceEntity(entity: Entity): boolean {
  return entity.kind === 'Component' && entity.spec?.type === 'service';
}
