import type { CiHealth } from '@internal/plugin-service-health-common';
import type { CiProvider } from './providers';
import type { GitHubActionsClient } from './githubActionsClient';

function unavailable(): CiHealth {
  return { status: 'UNAVAILABLE', score: null, lastRun: null };
}

export class GitHubActionsCiProvider implements CiProvider {
  constructor(private readonly client: GitHubActionsClient) {}

  async getCiHealth(entityRef: string): Promise<CiHealth> {
    const run = await this.client.getLatestCompletedRun(entityRef);
    if (!run) {
      return unavailable();
    }

    return {
      status: run.conclusion === 'success' ? 'PASSING' : 'FAILING',
      score: run.conclusion === 'success' ? 100 : 0,
      lastRun: new Date(run.updatedAt).toISOString(),
    };
  }
}
