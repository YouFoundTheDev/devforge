import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { createElement } from 'react';
import { isServiceEntity } from './entityFilter';

const serviceHealthContent = EntityContentBlueprint.make({
  name: 'service-health',
  params: {
    path: '/service-health',
    title: 'Service Health',
    filter: isServiceEntity,
    loader: () =>
      import('./components/ServiceHealthContent').then(
        ({ ServiceHealthContent }) => createElement(ServiceHealthContent),
      ),
  },
});

export const serviceHealthPlugin = createFrontendPlugin({
  pluginId: 'service-health',
  extensions: [serviceHealthContent],
});

export default serviceHealthPlugin;
