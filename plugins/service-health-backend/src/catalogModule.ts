import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import {
  catalogLocationsExtensionPoint,
  catalogProcessingExtensionPoint,
} from '@backstage/plugin-catalog-node';
import { resolve } from 'node:path';
import { DevForgeLocalCatalogProcessor } from './localCatalogProcessor';
import { LOCAL_CATALOG_LOCATION_TYPE } from './actions/registerLocal';

export const devforgeLocalCatalogModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'devforge-local-locations',
  register(reg) {
    reg.registerInit({
      deps: {
        config: coreServices.rootConfig,
        locations: catalogLocationsExtensionPoint,
        processing: catalogProcessingExtensionPoint,
      },
      async init({ config, locations, processing }) {
        const outputPath =
          config.getOptionalString('devforge.generatedServicesPath') ??
          '../../generated-services';
        const generatedServicesPath = resolve(process.cwd(), outputPath);
        locations.setAllowedLocationTypes([
          'url',
          LOCAL_CATALOG_LOCATION_TYPE,
        ]);
        processing.addProcessor(
          new DevForgeLocalCatalogProcessor(generatedServicesPath),
        );
      },
    });
  },
});
