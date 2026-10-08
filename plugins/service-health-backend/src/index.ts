import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
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
      },
      async init({ httpRouter, config }) {
        const mockMode = config.getOptionalBoolean('devforge.mockMode') ?? true;
        const providers = createServiceHealthProviders(mockMode);
        const aggregator = new ServiceHealthAggregator(providers);
        httpRouter.use(createHealthRouter(aggregator));
      },
    });
  },
});

export default serviceHealthBackend;
