import * as assert from 'assert';
import * as path from 'path';
import { ripgrepSearch, ripgrepPath, Match } from '../../../lib/ripgrep.js';

const fixtureRoot = path.resolve(__dirname, '../../../../test-fixture');

suite('ripgrepSearch Integration Tests', () => {
  const rgPath = ripgrepPath();

  suite('Normal Operation', () => {
    test('should resolve with matches when pattern is found', async () => {
      const cwd = path.join(fixtureRoot, 'generate-all');
      const results = await ripgrepSearch(cwd, {
        rgPath,
        regex: '@bp',
      });

      assert.ok(Array.isArray(results), 'Should return an array');
      assert.ok(
        results.length > 0,
        `Should have matches, got ${results.length}`
      );
      assert.ok(
        results.every((m) => m instanceof Match),
        'All results should be Match instances'
      );
    });

    test('should resolve with empty array when no matches found', async () => {
      // rg exits with code 1 when no matches are found (not an error).
      // With the stderr fix, since there's no stderr output,
      // promise should resolve (not reject).
      const cwd = path.join(fixtureRoot, 'generate-all');
      const results = await ripgrepSearch(cwd, {
        rgPath,
        regex: 'THIS_PATTERN_WILL_NEVER_MATCH_ANYTHING_12345',
      });

      assert.ok(Array.isArray(results), 'Should return an array');
      assert.strictEqual(results.length, 0, 'Should have no matches');
    });
  });

  suite('Error Handling', () => {
    test('should reject with error for invalid regex', async () => {
      // A malformed PCRE regex causes rg to exit non-zero with stderr output.
      // This should reject with a RipgrepError.
      const cwd = path.join(fixtureRoot, 'generate-all');
      await assert.rejects(
        () =>
          ripgrepSearch(cwd, {
            rgPath,
            regex: '(?P<unclosed',
          }),
        (err: Error) => {
          assert.ok(err instanceof Error, 'Should reject with an Error');
          return true;
        },
        'Should reject for invalid regex'
      );
    });

    test('should reject when cwd does not exist', async () => {
      await assert.rejects(
        () =>
          ripgrepSearch('/nonexistent/path/that/does/not/exist', {
            rgPath,
            regex: '@bp',
          }),
        (err: any) => {
          assert.ok(err.error, 'Should have error property');
          assert.ok(
            err.error.includes('root folder not found'),
            `Error message should mention root folder, got: ${err.error}`
          );
          return true;
        },
        'Should reject for non-existent cwd'
      );
    });

    test('should reject when rgPath does not exist', async () => {
      const cwd = path.join(fixtureRoot, 'generate-all');
      await assert.rejects(
        () =>
          ripgrepSearch(cwd, {
            rgPath: '/nonexistent/rg-binary',
            regex: '@bp',
          }),
        (err: any) => {
          assert.ok(err.error, 'Should have error property');
          assert.ok(
            err.error.includes('ripgrep executable not found'),
            `Error message should mention executable, got: ${err.error}`
          );
          return true;
        },
        'Should reject for non-existent rgPath'
      );
    });
  });

  suite('Match Parsing', () => {
    test('should parse match results with correct file path, line, and column', async () => {
      const cwd = path.join(fixtureRoot, 'generate-all');
      const results = await ripgrepSearch(cwd, {
        rgPath,
        regex: '@bp',
      });

      assert.ok(results.length > 0, 'Should have results to validate');

      for (const match of results) {
        assert.ok(
          match.fsPath,
          `Match should have fsPath, got: "${match.fsPath}"`
        );
        assert.ok(
          match.line > 0,
          `Match line should be positive, got: ${match.line}`
        );
        assert.ok(
          match.column > 0,
          `Match column should be positive, got: ${match.column}`
        );
        assert.ok(
          typeof match.match === 'string',
          `Match text should be a string, got: ${typeof match.match}`
        );
      }
    });
  });
});
