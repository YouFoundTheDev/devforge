import express from 'express';
import type { Server } from 'node:http';
import type { ServiceHealthResponse } from '@internal/plugin-service-health-common';
import {
  HealthProvidersUnavailableError,
  UnknownServiceEntityError,
} from './providers';
import { createHealthRouter } from './router';

describe('service health API', () => {
  const sample: ServiceHealthResponse = {
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
      recentDeployments: [{ version: 'v1.4.2', status: 'SUCCESS' }],
    },
    security: {
      status: 'PASSING',
      score: 94,
      findings: { critical: 0, high: 1, medium: 2, secrets: 0 },
      sast: 'PASS',
      containerScan: 'PASS',
    },
    documentation: { status: 'COMPLETE', score: 92 },
    dependencies: [],
    sourceErrors: [],
  };

  let server: Server;
  let baseUrl: string;
  let getHealth: jest.Mock;

  beforeEach(async () => {
    getHealth = jest.fn().mockResolvedValue(sample);
    const app = express();
    app.use('/api/service-health', createHealthRouter({ getHealth }));
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port');
    }
    baseUrl = `http://127.0.0.1:${address.port}/api/service-health/v1`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  });

  it('returns health data for a valid service entity reference', async () => {
    const response = await fetch(
      `${baseUrl}?entityRef=${encodeURIComponent(sample.entityRef)}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      entityRef: sample.entityRef,
      score: 94,
      deployment: { version: 'v1.4.2' },
    });
    expect(getHealth).toHaveBeenCalledWith(sample.entityRef);
  });

  it('rejects missing and malformed references', async () => {
    const missing = await fetch(baseUrl);
    const malformed = await fetch(
      `${baseUrl}?entityRef=${encodeURIComponent('not-an-entity-ref')}`,
    );

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(getHealth).not.toHaveBeenCalled();
  });

  it('returns not found for an entity without a demo fixture', async () => {
    getHealth.mockRejectedValue(
      new UnknownServiceEntityError('component:default/unknown'),
    );
    const response = await fetch(
      `${baseUrl}?entityRef=${encodeURIComponent('component:default/unknown')}`,
    );

    expect(response.status).toBe(404);
  });

  it('returns a service error when all health providers are unavailable', async () => {
    getHealth.mockRejectedValue(new HealthProvidersUnavailableError());
    const response = await fetch(
      `${baseUrl}?entityRef=${encodeURIComponent(sample.entityRef)}`,
    );

    expect(response.status).toBe(503);
  });
});
