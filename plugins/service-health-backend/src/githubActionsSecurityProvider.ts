import type { SecurityHealth } from '@internal/plugin-service-health-common';
import type {
  GitHubActionsClient,
  GitHubActionsStep,
} from './githubActionsClient';
import type { SecurityProvider } from './providers';

function mapStepConclusion(
  steps: GitHubActionsStep[],
  stepName: string,
): SecurityHealth['dependencyAudit'] {
  const conclusions = steps
    .filter(step => step.name === stepName)
    .map(step => step.conclusion);

  if (conclusions.length === 0) {
    return 'UNAVAILABLE';
  }
  if (conclusions.includes('failure')) {
    return 'FAIL';
  }
  if (conclusions.every(conclusion => conclusion === 'success')) {
    return 'PASS';
  }
  return 'UNAVAILABLE';
}

function unavailableSecurity(): SecurityHealth {
  return {
    status: 'UNAVAILABLE',
    score: null,
    findings: { critical: null, high: null, medium: null, secrets: null },
    dependencyAudit: 'UNAVAILABLE',
    sast: 'UNAVAILABLE',
    containerScan: 'UNAVAILABLE',
  };
}

export class GitHubActionsSecurityProvider implements SecurityProvider {
  constructor(private readonly client: GitHubActionsClient) {}

  async getSecurityHealth(entityRef: string): Promise<SecurityHealth> {
    const run = await this.client.getLatestCompletedRun(entityRef);
    if (!run) {
      return unavailableSecurity();
    }

    const steps = await this.client.getRunSteps(run);
    const dependencyAudit = mapStepConclusion(steps, 'Dependency audit');
    const containerScan = mapStepConclusion(steps, 'Scan container');
    const failing = dependencyAudit === 'FAIL' || containerScan === 'FAIL';
    const passing = dependencyAudit === 'PASS' && containerScan === 'PASS';
    let status: SecurityHealth['status'] = 'UNAVAILABLE';
    if (failing) {
      status = 'FAILING';
    } else if (passing) {
      status = 'PASSING';
    }

    return {
      ...unavailableSecurity(),
      status,
      dependencyAudit,
      containerScan,
    };
  }
}
