import type { Entity } from '@backstage/catalog-model';
import { isServiceEntity } from './entityFilter';

describe('isServiceEntity', () => {
  it('matches only service Components', () => {
    const service: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: { name: 'threat-intel-api' },
      spec: { type: 'service' },
    };
    const library: Entity = {
      ...service,
      metadata: { name: 'service-health-plugin' },
      spec: { type: 'library' },
    };
    const system: Entity = {
      ...service,
      kind: 'System',
    };

    expect(isServiceEntity(service)).toBe(true);
    expect(isServiceEntity(library)).toBe(false);
    expect(isServiceEntity(system)).toBe(false);
  });
});
