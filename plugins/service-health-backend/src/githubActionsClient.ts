import type { Entity } from '@backstage/catalog-model';
import type { CatalogEntityLookup } from './catalogEntityLookup';

interface WorkflowRunsResponse {
  workflow_runs?: unknown;
  total_count?: unknown;
}

interface WorkflowJobsResponse {
  jobs?: unknown;
  total_count?: unknown;
}

export interface GitHubActionsRun {
  id: number;
  owner: string;
  repository: string;
  conclusion: string | null;
  status: 'completed';
  updatedAt: string;
}

export interface GitHubActionsStep {
  name: string;
  conclusion: string | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkflowRun(value: unknown): value is {
  id: number;
  conclusion: string | null;
  status: 'completed';
  updated_at: string;
} {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.id) &&
    (typeof value.conclusion === 'string' || value.conclusion === null) &&
    value.status === 'completed' &&
    typeof value.updated_at === 'string' &&
    Number.isFinite(Date.parse(value.updated_at))
  );
}

export class GitHubActionsClient {
  private readonly pendingRuns = new Map<
    string,
    Promise<GitHubActionsRun | undefined>
  >();

  constructor(
    private readonly lookupEntity: CatalogEntityLookup,
    private readonly options: {
      token?: string;
      fetchApi?: typeof fetch;
      timeoutMs?: number;
    } = {},
  ) {}

  getLatestCompletedRun(
    entityRef: string,
  ): Promise<GitHubActionsRun | undefined> {
    const pending = this.pendingRuns.get(entityRef);
    if (pending) {
      return pending;
    }

    const request = this.fetchLatestCompletedRun(entityRef);
    this.pendingRuns.set(entityRef, request);
    void request.then(
      () => this.pendingRuns.delete(entityRef),
      () => this.pendingRuns.delete(entityRef),
    );
    return request;
  }

  async getRunSteps(run: GitHubActionsRun): Promise<GitHubActionsStep[]> {
    const url = new URL(
      `/repos/${encodeURIComponent(run.owner)}/${encodeURIComponent(
        run.repository,
      )}/actions/runs/${run.id}/jobs`,
      'https://api.github.com',
    );
    url.searchParams.set('per_page', '100');

    try {
      const payload = await this.requestJson<WorkflowJobsResponse>(url);
      if (
        !Array.isArray(payload.jobs) ||
        typeof payload.total_count !== 'number' ||
        !Number.isSafeInteger(payload.total_count) ||
        payload.total_count < 0 ||
        payload.total_count > payload.jobs.length
      ) {
        throw new GitHubActionsProviderError();
      }

      const steps: GitHubActionsStep[] = [];
      for (const job of payload.jobs) {
        if (!isRecord(job)) {
          throw new GitHubActionsProviderError();
        }
        if (job.steps === undefined || job.steps === null) {
          continue;
        }
        if (!Array.isArray(job.steps)) {
          throw new GitHubActionsProviderError();
        }
        for (const step of job.steps) {
          if (
            !isRecord(step) ||
            typeof step.name !== 'string' ||
            (typeof step.conclusion !== 'string' && step.conclusion !== null)
          ) {
            throw new GitHubActionsProviderError();
          }
          steps.push({ name: step.name, conclusion: step.conclusion });
        }
      }
      return steps;
    } catch {
      throw new GitHubActionsProviderError();
    }
  }

  private async fetchLatestCompletedRun(
    entityRef: string,
  ): Promise<GitHubActionsRun | undefined> {
    let entity: Entity | undefined;
    try {
      entity = await this.lookupEntity(entityRef);
    } catch {
      throw new GitHubActionsProviderError();
    }

    const slug = getRepositorySlug(entity);
    if (!slug) {
      return undefined;
    }
    const [owner, repository] = slug.split('/');
    if (
      !owner ||
      !repository ||
      owner === '.' ||
      owner === '..' ||
      repository === '.' ||
      repository === '..'
    ) {
      return undefined;
    }

    const url = new URL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repository,
      )}/actions/runs`,
      'https://api.github.com',
    );
    url.searchParams.set('status', 'completed');
    url.searchParams.set('per_page', '1');

    try {
      const payload = await this.requestJson<WorkflowRunsResponse>(url);
      if (
        !Array.isArray(payload.workflow_runs) ||
        typeof payload.total_count !== 'number' ||
        !Number.isSafeInteger(payload.total_count) ||
        payload.total_count < 0
      ) {
        throw new GitHubActionsProviderError();
      }
      if (payload.total_count === 0 || payload.workflow_runs.length === 0) {
        return undefined;
      }

      const latestRun = payload.workflow_runs[0];
      if (!isWorkflowRun(latestRun)) {
        throw new GitHubActionsProviderError();
      }
      return {
        id: latestRun.id,
        owner,
        repository,
        conclusion: latestRun.conclusion,
        status: latestRun.status,
        updatedAt: latestRun.updated_at,
      };
    } catch {
      throw new GitHubActionsProviderError();
    }
  }

  private async requestJson<T>(url: URL): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }

    const response = await (this.options.fetchApi ?? fetch)(url, {
      headers,
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
    });
    if (!response.ok) {
      throw new GitHubActionsProviderError();
    }
    return (await response.json()) as T;
  }
}
