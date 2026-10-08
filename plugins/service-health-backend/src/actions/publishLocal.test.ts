import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishWorkspaceLocally } from './publishLocal';

describe('publishWorkspaceLocally', () => {
  let root: string;
  let workspace: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'devforge-generated-'));
    workspace = join(root, 'workspace');
    await mkdir(workspace);
    await writeFile(join(workspace, 'README.md'), '# Generated service');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('persists the generated workspace under its validated service name', async () => {
    const outputRoot = join(root, 'output');
    const result = await publishWorkspaceLocally(
      workspace,
      'example-service',
      outputRoot,
    );

    await expect(
      readFile(join(result.outputPath, 'README.md'), 'utf8'),
    ).resolves.toBe('# Generated service');
    expect(result.catalogInfoUrl).toContain(
      '/example-service/catalog-info.yaml',
    );
    expect(result.apiInfoUrl).toContain('/example-service/api-info.yaml');
  });

  it('rejects invalid names and refuses to overwrite an existing service', async () => {
    const outputRoot = join(root, 'output');
    await expect(
      publishWorkspaceLocally(workspace, '../outside', outputRoot),
    ).rejects.toThrow('lowercase kebab-case');

    await publishWorkspaceLocally(workspace, 'existing-service', outputRoot);
    await expect(
      publishWorkspaceLocally(workspace, 'existing-service', outputRoot),
    ).rejects.toThrow();
  });
});
