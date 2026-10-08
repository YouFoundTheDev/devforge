import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { ScmIntegrations } from '@backstage/integration';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createCatalogEntityLookup } from './catalogEntityLookup';
import { ServiceHealthAggregator } from './healthAggregator';
import { createHealthRouter } from './router';
import { createServiceHealthProviders } from './serviceHealthProviders';

export { serviceHealthScaffolderModule } from './scaffolderModule';
export { devforgeLocalCatalogModule } from './catalogModule';

export const serviceHealthBackend = createBackendPlugin({
  pluginId: 'service-health',
  register(reg) {
    reg.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
        auth: coreServices.auth,
        catalog: catalogServiceRef,
      },
      async init({ httpRouter, config, auth, catalog }) {
        const mockMode = config.getOptionalBoolean('devforge.mockMode') ?? true;
        const integrations = ScmIntegrations.fromConfig(config);
        const github = integrations.github.byHost('github.com');
        const providers = mockMode
          ? createServiceHealthProviders(true)
          : createServiceHealthProviders(false, {
              lookupEntity: createCatalogEntityLookup(catalog, auth),
              githubToken: github?.config.token,
            });
        const aggregator = new ServiceHealthAggregator(providers);
        httpRouter.use(createHealthRouter(aggregator));
      },
    });
  },
});

export default serviceHealthBackend;
