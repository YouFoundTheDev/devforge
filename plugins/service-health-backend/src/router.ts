import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import Router from 'express-promise-router';
import {
  HealthProvidersUnavailableError,
  UnknownServiceEntityError,
} from './providers';
import type { ServiceHealthReader } from './healthAggregator';

export function createHealthRouter(aggregator: ServiceHealthReader) {
  const router = Router();

  router.get('/v1', async (request, response) => {
    const entityRefParam = request.query.entityRef;
    if (typeof entityRefParam !== 'string') {
      return response.status(400).json({ error: 'entityRef is required.' });
    }

    let entityRef: string;
    try {
      const parsedEntityRef = parseEntityRef(entityRefParam);
      if (parsedEntityRef.kind.toLowerCase() !== 'component') {
        return response
          .status(400)
          .json({ error: 'entityRef must refer to a Component.' });
      }
      entityRef = stringifyEntityRef(parsedEntityRef);
    } catch {
      return response.status(400).json({ error: 'entityRef is invalid.' });
    }

    try {
      const health = await aggregator.getHealth(entityRef);
      return response.status(200).json(health);
    } catch (error) {
      if (error instanceof UnknownServiceEntityError) {
        return response
          .status(404)
          .json({ error: 'Service health data not found.' });
      }
      if (error instanceof HealthProvidersUnavailableError) {
        return response
          .status(503)
          .json({ error: 'Service health data is temporarily unavailable.' });
      }
      throw error;
    }
  });

  return router;
}
