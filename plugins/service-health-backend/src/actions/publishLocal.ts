import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

export interface LocalPublishResult {
  outputPath: string;
  catalogInfoUrl: string;
  apiInfoUrl: string;
}

export async function publishWorkspaceLocally(
  workspacePath: string,
  name: string,
  outputRoot: string,
): Promise<LocalPublishResult> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error('Service name must be lowercase kebab-case.');
  }

  const root = resolve(outputRoot);
  const outputPath = resolve(root, name);
  if (dirname(outputPath) !== root) {
    throw new Error('Service output path must stay within the generated root.');
  }

  await mkdir(root, { recursive: true });
  await mkdir(outputPath);
  try {
    const entries = await readdir(workspacePath);
    for (const entry of entries) {
      await cp(resolve(workspacePath, entry), resolve(outputPath, entry), {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    }
  } catch (error) {
    await rm(outputPath, { recursive: true, force: true });
    throw error;
  }

  return {
    outputPath,
    catalogInfoUrl: pathToFileURL(resolve(outputPath, 'catalog-info.yaml')).href,
    apiInfoUrl: pathToFileURL(resolve(outputPath, 'api-info.yaml')).href,
  };
}

export function createLocalPublishAction(outputRoot: string) {
  return createTemplateAction({
    id: 'devforge:publish:local',
    description:
      'Copy generated service files to the local generated-services directory.',
    schema: {
      input: {
        name: z => z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      },
      output: {
        outputPath: z => z.string(),
        catalogInfoUrl: z => z.string(),
        apiInfoUrl: z => z.string(),
      },
    },
    async handler(ctx) {
      const result = await publishWorkspaceLocally(
        ctx.workspacePath,
        ctx.input.name,
        outputRoot,
      );
      ctx.output('outputPath', result.outputPath);
      ctx.output('catalogInfoUrl', result.catalogInfoUrl);
      ctx.output('apiInfoUrl', result.apiInfoUrl);
      ctx.logger.info(`Generated service saved to ${result.outputPath}`);
    },
  });
}
