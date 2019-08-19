import execa from 'execa';
import envCi from 'env-ci';
import chunk from 'lodash.chunk';
import to from 'await-to-js';

import { App } from '@octokit/app';
import Octokit from '@octokit/rest';

const { isCi, ...env } = envCi();
const [owner = '', repo = ''] = 'slug' in env ? env.slug.split('/') : [];

async function getApp(app: App) {
  const jwt = app.getSignedJsonWebToken();

  const octokit = new Octokit({
    auth: jwt
  });

  return octokit.apps.getAuthenticated();
}

/**
 * Create an octokit by authenticating with a github app and verifying the installation
 *
 * @param {App} app - GitHub app
 */
async function authenticateApp(app: App) {
  const jwt = app.getSignedJsonWebToken();

  const appOctokit = new Octokit({
    auth: jwt,
    baseUrl: process.env.GH_API || 'https://api.github.com'
  });

  const { data } = await appOctokit.apps.getRepoInstallation({
    owner,
    repo
  });

  const token = await app.getInstallationAccessToken({
    installationId: data.id
  });

  return new Octokit({
    auth: token,
    previews: ['symmetra-preview']
  });
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

  const app = new App({ id: appId, privateKey });
  const HEAD = await execa('git', ['rev-parse', 'HEAD']);
  const appInfo = await getApp(app);
  const [err, octokit] = await to(authenticateApp(app));

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

  const run = await octokit.checks.create({
    owner,
    repo,
    name,
    head_sha: HEAD.stdout,
    conclusion: (errorCount > 0 && 'failure') || 'success',
    output: {
      title: `${tool} Results`,
      summary,
      annotations: first
    }
  });

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
