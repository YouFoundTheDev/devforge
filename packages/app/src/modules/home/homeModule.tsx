import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import { DevForgeDashboard } from './DevForgeDashboard';

const dashboardWidget = HomePageWidgetBlueprint.make({
  name: 'devforge-dashboard',
  params: {
    name: 'DevForgeDashboard',
    title: 'Platform overview',
    description: 'Service delivery and operational posture at a glance.',
    components: async () => ({ Content: DevForgeDashboard }),
  },
});

export const homeModule = createFrontendModule({
  pluginId: 'home',
  extensions: [dashboardWidget],
});
