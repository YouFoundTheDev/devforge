import type { Entity } from '@backstage/catalog-model';
import { isHealthEntity } from './entityFilter';

describe('isHealthEntity', () => {
  it('matches service and website Components only', () => {
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
    const website: Entity = {
      ...service,
      metadata: { name: 'devforge-portal' },
      spec: { type: 'website' },
    };
    const system: Entity = {
      ...service,
      kind: 'System',
    };

    expect(isHealthEntity(service)).toBe(true);
    expect(isHealthEntity(website)).toBe(true);
    expect(isHealthEntity(library)).toBe(false);
    expect(isHealthEntity(system)).toBe(false);
  });
});
