import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

export type LocalCatalogDescriptor = 'catalog-info.yaml' | 'api-info.yaml';
export const LOCAL_CATALOG_LOCATION_TYPE = 'devforge-local';

export function resolveLocalDescriptorPath(
  outputRoot: string,
  name: string,
  descriptor: LocalCatalogDescriptor,
): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error('Service name must be lowercase kebab-case.');
  }

  const root = resolve(outputRoot);
  const servicePath = resolve(root, name);
  if (dirname(servicePath) !== root) {
    throw new Error('Service output path must stay within the generated root.');
  }

  const descriptorPath = resolve(servicePath, descriptor);
  if (dirname(descriptorPath) !== servicePath) {
    throw new Error('Catalog descriptor path must stay within the service.');
  }
  return descriptorPath;
}

export function parseLocalCatalogTarget(
  target: string,
): { name: string; descriptor: LocalCatalogDescriptor } | undefined {
  const match =
    /^([a-z0-9]+(?:-[a-z0-9]+)*)\/(catalog-info\.yaml|api-info\.yaml)$/.exec(
      target,
    );
  if (!match) {
    return undefined;
  }
  return {
    name: match[1],
    descriptor:
      match[2] === 'api-info.yaml' ? 'api-info.yaml' : 'catalog-info.yaml',
  };
}

export function createLocalCatalogRegisterAction(
  catalog: CatalogService,
  outputRoot: string,
) {
  return createTemplateAction({
    id: 'devforge:catalog:register-local',
    description: 'Register a generated local descriptor in the software catalog.',
    schema: {
      input: {
        name: z => z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        descriptor: z => z.enum(['catalog-info.yaml', 'api-info.yaml']),
      },
      output: {
        locationEntityRef: z => z.string(),
      },
    },
    async handler(ctx) {
      const target = resolveLocalDescriptorPath(
        outputRoot,
        ctx.input.name,
        ctx.input.descriptor,
      );
      await access(target);
      const { location } = await catalog.addLocation(
        {
          type: LOCAL_CATALOG_LOCATION_TYPE,
          target: `${ctx.input.name}/${ctx.input.descriptor}`,
        },
        { credentials: await ctx.getInitiatorCredentials() },
      );
      ctx.output('locationEntityRef', location.entityRef);
      ctx.logger.info(`Registered local catalog descriptor ${target}`);
    },
  });
}
