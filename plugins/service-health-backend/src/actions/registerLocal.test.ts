import {
  parseLocalCatalogTarget,
  resolveLocalDescriptorPath,
} from './registerLocal';

describe('resolveLocalDescriptorPath', () => {
  it('resolves only supported descriptors inside the generated service directory', () => {
    expect(
      resolveLocalDescriptorPath(
        '/tmp/generated-services',
        'example-service',
        'catalog-info.yaml',
      ),
    ).toBe('/tmp/generated-services/example-service/catalog-info.yaml');
    expect(
      resolveLocalDescriptorPath(
        '/tmp/generated-services',
        'example-service',
        'api-info.yaml',
      ),
    ).toBe('/tmp/generated-services/example-service/api-info.yaml');
  });

  it('rejects service names that could escape the generated directory', () => {
    expect(() =>
      resolveLocalDescriptorPath(
        '/tmp/generated-services',
        '../outside',
        'catalog-info.yaml',
      ),
    ).toThrow('lowercase kebab-case');
  });

  it('accepts only service descriptor targets', () => {
    expect(parseLocalCatalogTarget('example-service/catalog-info.yaml')).toEqual(
      { name: 'example-service', descriptor: 'catalog-info.yaml' },
    );
    expect(parseLocalCatalogTarget('example-service/api-info.yaml')).toEqual({
      name: 'example-service',
      descriptor: 'api-info.yaml',
    });
    expect(parseLocalCatalogTarget('../secrets')).toBeUndefined();
    expect(parseLocalCatalogTarget('example-service/README.md')).toBeUndefined();
  });
});
