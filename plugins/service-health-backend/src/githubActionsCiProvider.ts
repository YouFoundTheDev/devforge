import type { Entity } from '@backstage/catalog-model';
import type { CiHealth } from '@internal/plugin-service-health-common';
import type { CatalogEntityLookup } from './catalogEntityLookup';
import type { CiProvider } from './providers';

interface WorkflowRunsResponse {
  workflow_runs?: unknown;
  total_count?: unknown;
}

interface WorkflowRun {
  conclusion: string | null;
  status: string;
  updated_at: string;
}

export class GitHubActionsProviderError extends Error {
  constructor() {
    super('GitHub Actions data is unavailable.');
    this.name = 'GitHubActionsProviderError';
  }
}

function getRepositorySlug(entity: Entity | undefined): string | undefined {
  const annotation = entity?.metadata.annotations?.['github.com/project-slug'];
  if (!annotation || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(annotation)) {
    return undefined;
  }
  return annotation;
}

function isWorkflowRun(value: unknown): value is WorkflowRun {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const run = value as Record<string, unknown>;
  return (
    run.status === 'completed' &&
    (typeof run.conclusion === 'string' || run.conclusion === null) &&
    typeof run.updated_at === 'string' &&
    Number.isFinite(Date.parse(run.updated_at))
  );
}

function unavailable(): CiHealth {
  return { status: 'UNAVAILABLE', score: null, lastRun: null };
}

export class GitHubActionsCiProvider implements CiProvider {
  constructor(
    private readonly lookupEntity: CatalogEntityLookup,
    private readonly options: {
      token?: string;
      fetchApi?: typeof fetch;
      timeoutMs?: number;
    } = {},
  ) {}

  async getCiHealth(entityRef: string): Promise<CiHealth> {
    const entity = await this.lookupEntity(entityRef);
    const slug = getRepositorySlug(entity);
    if (!slug) {
      return unavailable();
    }

    const [, owner, repository] = slug.match(/^([^/]+)\/([^/]+)$/) ?? [];
    if (!owner || !repository) {
      return unavailable();
    }
    if (
      owner === '.' ||
      owner === '..' ||
      repository === '.' ||
      repository === '..'
    ) {
      return unavailable();
    }
    const url = new URL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repository,
      )}/actions/runs`,
      'https://api.github.com',
    );
    url.searchParams.set('status', 'completed');
    url.searchParams.set('per_page', '1');

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }

    try {
      const response = await (this.options.fetchApi ?? fetch)(url, {
        headers,
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
      });
      if (!response.ok) {
        throw new GitHubActionsProviderError();
      }

      const payload = (await response.json()) as WorkflowRunsResponse;
      if (
        !Array.isArray(payload.workflow_runs) ||
        typeof payload.total_count !== 'number'
      ) {
        throw new GitHubActionsProviderError();
      }
      if (payload.total_count === 0 || payload.workflow_runs.length === 0) {
        return unavailable();
      }

      const latestRun = payload.workflow_runs[0];
      if (!isWorkflowRun(latestRun)) {
        throw new GitHubActionsProviderError();
      }

      return {
        status: latestRun.conclusion === 'success' ? 'PASSING' : 'FAILING',
        score: latestRun.conclusion === 'success' ? 100 : 0,
        lastRun: new Date(latestRun.updated_at).toISOString(),
      };
    } catch {
      throw new GitHubActionsProviderError();
    }
  }
}
