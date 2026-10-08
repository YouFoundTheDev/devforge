import { useEffect, useState } from 'react';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { serviceHealthResponseSchema } from '@internal/plugin-service-health-common';
import type { ServiceHealthResponse } from '@internal/plugin-service-health-common';
import { ServiceHealthView } from './ServiceHealthView';

export function ServiceHealthContent() {
  const { entity } = useEntity();
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const entityRef = stringifyEntityRef(entity);
  const [health, setHealth] = useState<ServiceHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadHealth = async () => {
      setLoading(true);
      setError(null);

      try {
        const serviceBaseUrl = await discoveryApi.getBaseUrl('service-health');
        const url = new URL(
          'v1',
          serviceBaseUrl.endsWith('/') ? serviceBaseUrl : `${serviceBaseUrl}/`,
        );
        url.searchParams.set('entityRef', entityRef);

        const response = await fetchApi.fetch(url.toString());
        if (!response.ok) {
          throw new Error(
            `Service health request failed with status ${response.status}.`,
          );
        }

        const payload: unknown = await response.json();
        const parsedHealth = serviceHealthResponseSchema.parse(payload);
        if (active) {
          setHealth(parsedHealth);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Service health could not be loaded.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadHealth();
    return () => {
      active = false;
    };
  }, [discoveryApi, entityRef, fetchApi, retryCount]);

  return (
    <ServiceHealthView
      health={health}
      loading={loading}
      error={error}
      onRetry={() => setRetryCount(count => count + 1)}
    />
  );
}
