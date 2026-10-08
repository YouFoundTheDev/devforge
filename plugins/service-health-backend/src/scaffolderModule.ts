import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { resolve } from 'node:path';
import { createLocalPublishAction } from './actions/publishLocal';
import { createLocalCatalogRegisterAction } from './actions/registerLocal';

export const serviceHealthScaffolderModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'devforge-local-publish',
  register(reg) {
    reg.registerInit({
      deps: {
        actions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
        catalog: catalogServiceRef,
      },
      async init({ actions, catalog, config }) {
        const outputPath =
          config.getOptionalString('devforge.generatedServicesPath') ??
          '../../generated-services';
        const generatedServicesPath = resolve(process.cwd(), outputPath);
        actions.addActions(
          createLocalPublishAction(generatedServicesPath),
          createLocalCatalogRegisterAction(catalog, generatedServicesPath),
        );
      },
    });
  },
});
