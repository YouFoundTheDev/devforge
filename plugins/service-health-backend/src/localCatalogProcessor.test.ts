import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CatalogProcessorParser } from '@backstage/plugin-catalog-node';
import {
  LOCAL_CATALOG_LOCATION_TYPE,
  type LocalCatalogDescriptor,
} from './actions/registerLocal';
import { DevForgeLocalCatalogProcessor } from './localCatalogProcessor';

describe('DevForgeLocalCatalogProcessor', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'devforge-catalog-'));
    await mkdir(join(root, 'example-service'));
    await writeFile(
      join(root, 'example-service', 'catalog-info.yaml'),
      'kind: Component',
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('parses generated descriptor files from an allowlisted target', async () => {
    const processor = new DevForgeLocalCatalogProcessor(root);
    const emitted: unknown[] = [];
    const location = {
      type: LOCAL_CATALOG_LOCATION_TYPE,
      target: 'example-service/catalog-info.yaml' satisfies `${string}/${LocalCatalogDescriptor}`,
    };
    const parser: CatalogProcessorParser = async function* ({ data }) {
      expect(data.toString()).toBe('kind: Component');
      yield { type: 'refresh', key: 'parsed-descriptor' };
    };

    await expect(
      processor.readLocation(location, false, result => emitted.push(result), parser),
    ).resolves.toBe(true);
    expect(emitted).toHaveLength(2);
  });

  it('rejects targets outside the generated descriptor allowlist', async () => {
    const processor = new DevForgeLocalCatalogProcessor(root);
    const emitted: unknown[] = [];

    await processor.readLocation(
      { type: LOCAL_CATALOG_LOCATION_TYPE, target: '../secrets' },
      false,
      result => emitted.push(result),
      async function* () {
        yield { type: 'refresh', key: 'unexpected' };
      },
    );
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ type: 'error' });
  });
});
