import * as path from 'path';
import * as fs from 'fs';

import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(
      __dirname,
      './integration/index.js'
    );

    // The path to the test workspace folder
    const workspacePath = path.resolve(__dirname, '../../test-fixture');

    // Create a temporary user data directory to isolate tests and silence network noise
    const userDataDir = path.resolve(__dirname, '../../.vscode-test/user-data');
    const settingsPath = path.join(userDataDir, 'User', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          'telemetry.telemetryLevel': 'off',
          'update.mode': 'none',
          'json.schemaDownload.enable': false,
          'http.proxySupport': 'off',
          'workbench.startupEditor': 'none',
          'extensions.autoUpdate': false,
          'extensions.autoCheckUpdates': false,
          'workbench.enableExperiments': false,
          'workbench.settings.enableNaturalLanguageSearch': false,
        },
        null,
        2
      )
    );

    // Download VS Code, unzip it and run the integration test
    await runTests({
      version: '1.90.0',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        workspacePath,
        '--disable-extensions',
        '--disable-telemetry',
        '--disable-updates',
        '--disable-crash-reporter',
        `--user-data-dir=${userDataDir}`,
      ],
      extensionTestsEnv: process.env,
    });
  } catch (err) {
    console.error(err);
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
