import express from 'express';
import type { Express } from 'express';
import { healthHandler } from './routes/health.js';

export function createServer(): Express {
  const app = express();
  app.get('/health', healthHandler);
  return app;
}

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  const app = createServer();
  return app.listen(port, () => {
    console.info(`DevForge service listening on port ${port}`);
  });
}
