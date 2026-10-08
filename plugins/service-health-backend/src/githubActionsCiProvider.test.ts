import type { Entity } from '@backstage/catalog-model';
import { GitHubActionsClient } from './githubActionsClient';
import { GitHubActionsCiProvider } from './githubActionsCiProvider';

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

describe('GitHubActionsCiProvider', () => {
  it('maps the latest completed successful run and sends its token only to GitHub', async () => {
    const fetchApi = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(() =>
        response({
          total_count: 4,
          workflow_runs: [
            {
              id: 42,
              status: 'completed',
              conclusion: 'success',
              updated_at: '2026-10-08T12:30:00Z',
            },
          ],
        }),
      );
    const client = new GitHubActionsClient(async () => entity, {
      token: 'server-only-token',
      fetchApi,
    });
    const provider = new GitHubActionsCiProvider(client);

    await expect(
      provider.getCiHealth('component:default/devforge-portal'),
    ).resolves.toEqual({
      status: 'PASSING',
      score: 100,
      lastRun: '2026-10-08T12:30:00.000Z',
    });

    const [request, options] = fetchApi.mock.calls[0]!;
    expect(String(request)).toBe(
      'https://api.github.com/repos/YouFoundTheDev/devforge/actions/runs?status=completed&per_page=1',
    );
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer server-only-token',
      Accept: 'application/vnd.github+json',
    });
  });

  it('maps a completed non-success run to failing CI', async () => {
    const provider = new GitHubActionsCiProvider(
      new GitHubActionsClient(async () => entity, {
        fetchApi: jest
          .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
          .mockImplementation(() =>
            response({
              total_count: 1,
              workflow_runs: [
                {
                  id: 42,
                  status: 'completed',
                  conclusion: 'failure',
                  updated_at: '2026-10-08T12:30:00Z',
                },
              ],
            }),
          ),
      }),
    );

    await expect(
      provider.getCiHealth('component:default/devforge-portal'),
    ).resolves.toMatchObject({ status: 'FAILING', score: 0 });
  });

  it('returns unavailable when the entity has no repository or no completed run', async () => {
    const fetchApi = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(() =>
        response({ total_count: 0, workflow_runs: [] }),
      );
    const noRepository = new GitHubActionsCiProvider(
      new GitHubActionsClient(
        async () => ({
          ...entity,
          metadata: { name: 'local-only' },
        }),
        { fetchApi },
      ),
    );
    const noRuns = new GitHubActionsCiProvider(
      new GitHubActionsClient(async () => entity, {
        fetchApi,
      }),
    );

    await expect(
      noRepository.getCiHealth('component:default/local-only'),
    ).resolves.toEqual({
      status: 'UNAVAILABLE',
      score: null,
      lastRun: null,
    });
    expect(fetchApi).not.toHaveBeenCalled();
    await expect(
      noRuns.getCiHealth('component:default/devforge-portal'),
    ).resolves.toEqual({
      status: 'UNAVAILABLE',
      score: null,
      lastRun: null,
    });
  });

  it('does not expose GitHub response or network errors', async () => {
    const provider = new GitHubActionsCiProvider(
      new GitHubActionsClient(async () => entity, {
        fetchApi: jest
          .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
          .mockRejectedValue(new Error('sensitive response details')),
      }),
    );

    await expect(
      provider.getCiHealth('component:default/devforge-portal'),
    ).rejects.toThrow('GitHub Actions data is unavailable.');
    await expect(
      provider.getCiHealth('component:default/devforge-portal'),
    ).rejects.not.toThrow('sensitive response details');
  });

  it('reports malformed repository annotations as unavailable without a request', async () => {
    const fetchApi = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const provider = new GitHubActionsCiProvider(
      new GitHubActionsClient(
        async () => ({
          ...entity,
          metadata: {
            name: 'malformed',
            annotations: { 'github.com/project-slug': 'owner/repo/extra' },
          },
        }),
        { fetchApi },
      ),
    );

    await expect(
      provider.getCiHealth('component:default/malformed'),
    ).resolves.toEqual({
      status: 'UNAVAILABLE',
      score: null,
      lastRun: null,
    });
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it('converts GitHub API errors, malformed responses, and timeouts into a generic error', async () => {
    const failingResponses = [
      () => response({ message: 'private repository details' }, 403),
      () =>
        response({
          total_count: 1,
          workflow_runs: [{ id: 42, status: 'queued' }],
        }),
    ];

    for (const fetchImplementation of failingResponses) {
      const provider = new GitHubActionsCiProvider(
        new GitHubActionsClient(async () => entity, {
          fetchApi: jest
            .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
            .mockImplementation(fetchImplementation),
        }),
      );

      await expect(
        provider.getCiHealth('component:default/devforge-portal'),
      ).rejects.toThrow('GitHub Actions data is unavailable.');
    }

    const timeoutFetch = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            const rejectOnAbort = () => reject(new Error('request timed out'));
            if (signal?.aborted) {
              rejectOnAbort();
            } else {
              signal?.addEventListener('abort', rejectOnAbort, { once: true });
            }
          }),
      );
    const timeoutProvider = new GitHubActionsCiProvider(
      new GitHubActionsClient(async () => entity, {
        fetchApi: timeoutFetch,
        timeoutMs: 0,
      }),
    );

    await expect(
      timeoutProvider.getCiHealth('component:default/devforge-portal'),
    ).rejects.toThrow('GitHub Actions data is unavailable.');
  });
});
