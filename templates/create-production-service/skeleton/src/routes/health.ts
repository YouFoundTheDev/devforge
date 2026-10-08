import type { RequestHandler } from 'express';

export const healthHandler: RequestHandler = (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: process.env.SERVICE_NAME ?? 'devforge-service',
  });
};
