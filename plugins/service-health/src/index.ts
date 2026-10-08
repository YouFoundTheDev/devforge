import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { createElement } from 'react';
import { isHealthEntity } from './entityFilter';

const serviceHealthContent = EntityContentBlueprint.make({
  name: 'service-health',
  params: {
    path: '/service-health',
    title: 'Service Health',
    filter: isHealthEntity,
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
