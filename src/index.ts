import execa from 'execa';
import envCi from 'env-ci';
import chunk from 'lodash.chunk';
import to from 'await-to-js';

import { App } from '@octokit/app';
import Octokit from '@octokit/rest';

const { isCi } = envCi();

async function getRepositoryParameters () {
  const regex = /https?:\/\/.*\/(.+)\/(.+)\.git/;
  const url = (await execa('git', ['rev-parse', 'HEAD'])).stdout;
  const [, owner = process.env.OWNER, repo = process.env.REPO] = url.match(regex) || [];
  return {
    owner, repo
  };
}

async function getApp(app: App, baseUrl: string) {
  const jwt = app.getSignedJsonWebToken();

  const octokit = new Octokit({
    auth: jwt,
    baseUrl
  });

  return octokit.apps.getAuthenticated();
}

async function authenticateApp(app: App, baseUrl: string) {
  const jwt = app.getSignedJsonWebToken();
  const appOctokit = new Octokit({ auth: jwt, baseUrl });
  const { owner, repo } = await getRepositoryParameters();
  const { data } = await appOctokit.apps.getRepoInstallation({
    owner,
    repo
  });

  const token = await app.getInstallationAccessToken({
    installationId: data.id
  });

  return new Octokit({ auth: token, baseUrl });
}

interface CheckOptions {
  /** The annotations to be posted to the GitHub check */
  annotations: Octokit.ChecksCreateParamsOutputAnnotations[];
  /** The number or errors generated during the run */
  errorCount: number;
  /** The number or warnings generated during the run */
  warningCount?: number;
  /** The GitHub app id to create the check with */
  appId: number;
  /** The GitHub private key to create the check with */
  privateKey: string;
  /** The name of the tool thats running */
  tool: string;
  /** The title of the check mark */
  name: string;
}

/** Add a GitHub check with annotations to the HEAD sha */
export default async function createCheck({
  annotations,
  errorCount,
  warningCount = 0,
  appId,
  privateKey,
  tool,
  name
}: CheckOptions) {
  if (!isCi) {
    return;
  }

  const baseUrl = process.env.GH_API || process.env.GITHUB_URL || 'https://api.github.com';
  const app = new App({
    id: appId,
    privateKey,
    baseUrl
  });
  const HEAD = (await execa('git', ['rev-parse', 'HEAD'])).stdout;
  const PRE_HEAD = (await execa('git', ['rev-parse', 'HEAD^1'])).stdout;
  const appInfo = await getApp(app, baseUrl);
  const [err, octokit] = await to(authenticateApp(app, baseUrl));

  if (err || !octokit) {
    if (err.message === 'Bad credentials') {
      // eslint-disable-next-line no-console
      console.log(
        `It looks like you don't have the "${appInfo.data.name}" Github App installed to your repo! ${appInfo.data.html_url}`
      );
      return;
    }

    throw err;
  }

  const summary =
    (errorCount > 0 && 'Your project seems to have some errors.') ||
    (warningCount > 0 && 'Your project seems to have some warnings.') ||
    'Your project passed lint!';
  const [first, ...rest] = chunk(annotations, 50);
  const { owner, repo } = await getRepositoryParameters();
  const check: Octokit.ChecksCreateParams = {
    owner,
    repo,
    name,
    completed_at: new Date().toISOString(),
    head_sha: HEAD,
    conclusion: (errorCount > 0 && 'failure') || 'success',
    output: {
      title: `${tool} Results`,
      summary,
      annotations: first
    }
  };

  const run = await octokit.checks
    .create(check)
    .catch(() => octokit.checks.create({ ...check, head_sha: PRE_HEAD }));

  await Promise.all(
    rest.map(async group =>
      octokit.checks.update({
        owner,
        repo,
        check_run_id: run.data.id,
        output: {
          title: `${tool} Results`,
          summary,
          annotations: group
        }
      })
    )
  );
}
