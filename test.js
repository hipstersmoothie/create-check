const createCheck = require('.').default;

async function main() {
  await createCheck({
    tool: 'smoke test',
    name: 'Ensure create-check works',
    warningCount: 1,
    appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY,
  });

  console.log('Created check on PR');
}

main();
