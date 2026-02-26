import path from 'node:path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    bail: true,
    timeout: 5000,
  });
  mocha.timeout(100000);

  const testsRoot = __dirname;

  const pattern = process.env.TEST_FILE_PATTERN || '**/**.test.js';
  console.log('pattern', pattern);
  return glob.glob(pattern, { cwd: testsRoot }).then(async (files) => {
    // Add files to the test suite
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    try {
      // Run the mocha test
      await new Promise<void>((resolve, reject) => {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(`${failures} tests failed.`);
          } else {
            resolve();
          }
        });
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  });
}
