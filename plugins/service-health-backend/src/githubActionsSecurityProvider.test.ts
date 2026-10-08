import type { Entity } from '@backstage/catalog-model';
import { GitHubActionsClient } from './githubActionsClient';
import { GitHubActionsSecurityProvider } from './githubActionsSecurityProvider';

const entity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'devforge-portal',
    annotations: { 'github.com/project-slug': 'YouFoundTheDev/devforge' },
  },
  spec: { type: 'website' },
};

function response(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function makeProvider(
  steps: unknown[],
  options: { runStatus?: number; jobsStatus?: number } = {},
) {
  const fetchApi = jest
    .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
    .mockImplementation(input => {
      const url = String(input);
      if (url.includes('/actions/runs?')) {
        return response(
          {
            total_count: 1,
            workflow_runs: [
              {
                id: 42,
                status: 'completed',
                conclusion: 'success',
                updated_at: '2026-10-08T12:30:00Z',
              },
            ],
          },
          options.runStatus ?? 200,
        );
      }
      return response(
        {
          total_count: 1,
          jobs: [{ steps }],
        },
        options.jobsStatus ?? 200,
      );
    });
  const client = new GitHubActionsClient(async () => entity, { fetchApi });
  return { provider: new GitHubActionsSecurityProvider(client), fetchApi };
}

const passingSteps = [
  { name: 'Dependency audit', conclusion: 'success' },
  { name: 'Scan container', conclusion: 'success' },
];

describe('GitHubActionsSecurityProvider', () => {
  it('maps passing checks and leaves unsupported measurements unavailable', async () => {
    const { provider } = makeProvider(passingSteps);

    await expect(
      provider.getSecurityHealth('component:default/devforge-portal'),
    ).resolves.toEqual({
      status: 'PASSING',
      score: null,
      findings: { critical: null, high: null, medium: null, secrets: null },
      dependencyAudit: 'PASS',
      sast: 'UNAVAILABLE',
      containerScan: 'PASS',
    });
  });

  it('reports failures independently and marks overall security as failing', async () => {
    const { provider } = makeProvider([
      { name: 'Dependency audit', conclusion: 'failure' },
      { name: 'Scan container', conclusion: 'success' },
    ]);

    await expect(
      provider.getSecurityHealth('component:default/devforge-portal'),
    ).resolves.toMatchObject({
      status: 'FAILING',
      dependencyAudit: 'FAIL',
      containerScan: 'PASS',
      findings: { high: null, critical: null },
    });
  });

  it('does not report passing when steps are missing or skipped', async () => {
    const { provider } = makeProvider([
      { name: 'Dependency audit', conclusion: 'success' },
      { name: 'Scan container', conclusion: 'skipped' },
    ]);

    await expect(
      provider.getSecurityHealth('component:default/devforge-portal'),
    ).resolves.toMatchObject({
      status: 'UNAVAILABLE',
      dependencyAudit: 'PASS',
      containerScan: 'UNAVAILABLE',
    });
  });

  it('treats unavailable job step details as missing scan results', async () => {
    const fetchApi = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(input =>
        String(input).includes('/actions/runs?')
          ? response({
              total_count: 1,
              workflow_runs: [
                {
                  id: 42,
                  status: 'completed',
                  conclusion: 'success',
                  updated_at: '2026-10-08T12:30:00Z',
                },
              ],
            })
          : response({ total_count: 1, jobs: [{}] }),
      );
    const provider = new GitHubActionsSecurityProvider(
      new GitHubActionsClient(async () => entity, { fetchApi }),
    );

    await expect(
      provider.getSecurityHealth('component:default/devforge-portal'),
    ).resolves.toMatchObject({
      status: 'UNAVAILABLE',
      dependencyAudit: 'UNAVAILABLE',
      containerScan: 'UNAVAILABLE',
    });
  });

  it('returns unavailable results when no completed workflow exists', async () => {
    const fetchApi = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(() =>
        response({ total_count: 0, workflow_runs: [] }),
      );
    const provider = new GitHubActionsSecurityProvider(
      new GitHubActionsClient(async () => entity, { fetchApi }),
    );

    await expect(
      provider.getSecurityHealth('component:default/devforge-portal'),
    ).resolves.toMatchObject({
      status: 'UNAVAILABLE',
      dependencyAudit: 'UNAVAILABLE',
      containerScan: 'UNAVAILABLE',
    });
    expect(fetchApi).toHaveBeenCalledTimes(1);
  });

  it('converts API failures and malformed job data into a generic provider error', async () => {
    for (const failure of [
      makeProvider(passingSteps, { jobsStatus: 403 }),
      makeProvider([{ name: 'Dependency audit' }]),
    ]) {
      await expect(
        failure.provider.getSecurityHealth('component:default/devforge-portal'),
      ).rejects.toThrow('GitHub Actions data is unavailable.');
    }
  });
});
