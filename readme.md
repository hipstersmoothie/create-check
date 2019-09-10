<div align="center">
  <img  height="200"
    src="./logo.png">
  <h1>create-check</h1>
  <p>Create a GitHub check with annotations on a PR</p>
</div>

## Highlights

- Detects PR number and creates check w/annotations
- Does nothing locally
- Only runs in CI environment

## Install

```sh
npm install --save-dev create-check
# or
yarn add -D create-check
```

## Usage

Everything is written in typescript with JSDOC comments so your editor should tell you what each option is and does.

```ts
import createCheck from 'create-check';

async function main() {
  await createCheck({
    tool: 'stylelint',
    name: 'Check Styles for Errors',
    annotations: createAnnotations(results),
    errorCount,
    warningCount,
    appId: APP_ID,
    privateKey: PRIVATE_KEY
  });

  console.log('Created check on PR');
}

main();
```

## Changing GitHub URL (enterprise)

To get this package to work on github enterprise instances you will need to set the `GH_API` or `GITHUB_URL` environment variable to a url pointing towards your enterprise GitHub's API.

## Env Vars

This library will detect all the data it needs from the env, but sometimes a CI doesn't expose everything. The following env vars can be set:

- `REPO`
- `OWNER`

## Related Libraries

- [stylelint-formatter-github](https://github.com/hipstersmoothie/stylelint-formatter-github) - See stylelint errors and warnings directly in pull requests
- [eslint-formatter-github](https://github.com/hipstersmoothie/eslint-formatter-github) - See eslint errors and warnings directly in pull requests
- [jest-github-reporter](https://github.com/hipstersmoothie/jest-github-reporter) - Report jest test errors directly in pull requests
