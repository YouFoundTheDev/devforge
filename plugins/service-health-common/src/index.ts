import { z } from 'zod';

const nullableScore = z.number().min(0).max(100).nullable();

export const serviceHealthResponseSchema = z.object({
  entityRef: z.string(),
  status: z.enum(['HEALTHY', 'DEGRADED', 'CRITICAL']),
  score: nullableScore,
  dataSource: z.enum(['demo', 'live']),
  ci: z.object({
    status: z.enum(['PASSING', 'FAILING', 'UNAVAILABLE']),
    score: nullableScore,
    lastRun: z.string().nullable(),
  }),
  deployment: z.object({
    status: z.enum(['HEALTHY', 'UNHEALTHY', 'UNAVAILABLE']),
    score: nullableScore,
    version: z.string().nullable(),
    environment: z.string().nullable(),
    lastDeployment: z.string().nullable(),
    recentDeployments: z.array(
      z.object({
        version: z.string(),
        status: z.enum(['SUCCESS', 'FAILED']),
      }),
    ),
  }),
  security: z.object({
    status: z.enum(['PASSING', 'FAILING', 'UNAVAILABLE']),
    score: nullableScore,
    findings: z.object({
      critical: z.number().int().min(0).nullable(),
      high: z.number().int().min(0).nullable(),
      medium: z.number().int().min(0).nullable(),
      secrets: z.number().int().min(0).nullable(),
    }),
    dependencyAudit: z.enum(['PASS', 'FAIL', 'UNAVAILABLE']),
    sast: z.enum(['PASS', 'FAIL', 'UNAVAILABLE']),
    containerScan: z.enum(['PASS', 'FAIL', 'UNAVAILABLE']),
  }),
  documentation: z.object({
    status: z.enum(['COMPLETE', 'INCOMPLETE', 'UNAVAILABLE']),
    score: nullableScore,
  }),
  dependencies: z.array(
    z.object({
      entityRef: z.string(),
      name: z.string(),
      status: z.enum(['HEALTHY', 'UNHEALTHY', 'UNAVAILABLE']),
    }),
  ),
  sourceErrors: z.array(
    z.object({
      provider: z.string(),
      message: z.string(),
    }),
  ),
});

export type ServiceHealthResponse = z.infer<typeof serviceHealthResponseSchema>;
export type CiHealth = ServiceHealthResponse['ci'];
export type DeploymentHealth = ServiceHealthResponse['deployment'];
export type SecurityHealth = ServiceHealthResponse['security'];
export type DocumentationHealth = ServiceHealthResponse['documentation'];
export type DependencyHealth = ServiceHealthResponse['dependencies'][number];
