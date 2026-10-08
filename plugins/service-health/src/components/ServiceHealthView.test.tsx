import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ServiceHealthView } from './ServiceHealthView';
import type { ServiceHealthResponse } from '@internal/plugin-service-health-common';

const health: ServiceHealthResponse = {
  entityRef: 'component:default/threat-intel-api',
  status: 'HEALTHY',
  score: 94,
  dataSource: 'demo',
  ci: { status: 'PASSING', score: 100, lastRun: '5 minutes ago' },
  deployment: {
    status: 'HEALTHY',
    score: 90,
    version: 'v1.4.2',
    environment: 'production',
    lastDeployment: '10 minutes ago',
    recentDeployments: [
      { version: 'v1.4.2', status: 'SUCCESS' },
      { version: 'v1.4.1', status: 'SUCCESS' },
      { version: 'v1.4.0', status: 'SUCCESS' },
    ],
  },
  security: {
    status: 'PASSING',
    score: 94,
    findings: { critical: 0, high: 1, medium: 2, secrets: 0 },
    sast: 'PASS',
    containerScan: 'PASS',
  },
  documentation: { status: 'COMPLETE', score: 92 },
  dependencies: [
    {
      entityRef: 'component:default/identity-service',
      name: 'identity-service',
      status: 'HEALTHY',
    },
    {
      entityRef: 'resource:default/postgresql',
      name: 'PostgreSQL',
      status: 'HEALTHY',
    },
    {
      entityRef: 'resource:default/redis',
      name: 'Redis',
      status: 'HEALTHY',
    },
  ],
  sourceErrors: [],
};

describe('ServiceHealthView', () => {
  it('renders the complete healthy service summary', () => {
    render(
      <ServiceHealthView
        health={health}
        loading={false}
        error={null}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('94/100')).toBeInTheDocument();
    expect(screen.getByText('MOCK DATA')).toBeInTheDocument();
    expect(screen.getByText('Version: v1.4.2')).toBeInTheDocument();
    expect(screen.getByText('v1.4.2')).toBeInTheDocument();
    expect(screen.getByText('Environment: production')).toBeInTheDocument();
    expect(screen.getByText('identity-service')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('Redis')).toBeInTheDocument();
    expect(screen.getByText('v1.4.0')).toBeInTheDocument();
    expect(
      screen.getByText(/Critical: 0 · High: 1 · Medium: 2 · Secrets: 0/),
    ).toBeInTheDocument();
  });

  it('shows loading and retryable error states', () => {
    const onRetry = jest.fn();
    const { rerender } = render(
      <ServiceHealthView
        health={null}
        loading
        error={null}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId('progress')).toBeInTheDocument();

    rerender(
      <ServiceHealthView
        health={null}
        loading={false}
        error="Service health request failed."
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Service health request failed.',
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
