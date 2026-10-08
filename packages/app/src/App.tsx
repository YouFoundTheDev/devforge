import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import apiDocsPlugin from '@backstage/plugin-api-docs/alpha';
import homePlugin from '@backstage/plugin-home/alpha';
import techdocsPlugin from '@backstage/plugin-techdocs/alpha';
import serviceHealthPlugin from '@internal/plugin-service-health';
import { navModule } from './modules/nav';
import { homeModule } from './modules/home';

export default createApp({
  features: [
    catalogPlugin,
    apiDocsPlugin,
    homePlugin,
    techdocsPlugin,
    serviceHealthPlugin,
    navModule,
    homeModule,
  ],
});
