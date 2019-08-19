<div align="center">
  <img  height="200"
    src="./logo.png">
  <h1>create-check</h1>
  <p>Create a GitHub check with annotations for a PR</p>
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
