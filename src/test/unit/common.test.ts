import { suite, test } from 'vitest';
import * as assert from 'node:assert';
import { getSearchGlobs, extToLanguageId } from '../../lib/common.js';

suite('Common Lib', () => {
  suite('extToLanguageId', () => {
    test('should identify javascript extensions', () => {
      assert.strictEqual(extToLanguageId('file.js'), 'javascript');
      assert.strictEqual(extToLanguageId('file.mjs'), 'javascript');
      assert.strictEqual(extToLanguageId('file.cjs'), 'javascript');
    });

    test('should identify typescript extensions', () => {
      assert.strictEqual(extToLanguageId('file.ts'), 'typescript');
      assert.strictEqual(extToLanguageId('file.mts'), 'typescript');
      assert.strictEqual(extToLanguageId('file.cts'), 'typescript');
    });

    test('should identify react extensions', () => {
      assert.strictEqual(extToLanguageId('file.jsx'), 'javascriptreact');
      assert.strictEqual(extToLanguageId('file.tsx'), 'typescriptreact');
    });

    test('should identify python extensions', () => {
      assert.strictEqual(extToLanguageId('file.py'), 'python');
    });

    test('should identify go extensions', () => {
      assert.strictEqual(extToLanguageId('file.go'), 'go');
    });

    test('should identify java extensions', () => {
      assert.strictEqual(extToLanguageId('file.java'), 'java');
    });

    test('should identify ruby extensions', () => {
      assert.strictEqual(extToLanguageId('file.rb'), 'ruby');
    });

    test('should identify rust extensions', () => {
      assert.strictEqual(extToLanguageId('file.rs'), 'rust');
    });

    test('should return empty string for unknown extension', () => {
      assert.strictEqual(extToLanguageId('file.unknown'), '');
    });

    test('should handle no extension', () => {
      assert.strictEqual(extToLanguageId('makefile'), '');
    });
  });

  suite('getSearchGlobs', () => {
    test('should return empty array if no config provided', () => {
      assert.deepStrictEqual(getSearchGlobs(undefined), []);
    });

    test('should return empty array if no languages enabled', () => {
      assert.deepStrictEqual(getSearchGlobs([]), []);
    });

    test('should return correct glob for single language', () => {
      const globs = getSearchGlobs(['javascript']);
      assert.strictEqual(globs.length, 1);
      const extensions = globs[0].match(/\{(.*)\}/)?.[1]?.split(',') || [];
      assert.ok(extensions.includes('js'));
      assert.ok(extensions.includes('mjs'));
      assert.ok(extensions.includes('cjs'));
    });

    test('should return combined glob for multiple languages', () => {
      const globs = getSearchGlobs(['javascript', 'python']);
      assert.strictEqual(globs.length, 1);
      const extensions = globs[0].match(/\{(.*)\}/)?.[1]?.split(',') || [];
      assert.ok(extensions.includes('js'));
      assert.ok(extensions.includes('py'));
    });

    test('should only include specified languages', () => {
      const globs = getSearchGlobs(['javascript']);
      assert.strictEqual(globs.length, 1);
      const extensions = globs[0].match(/\{(.*)\}/)?.[1]?.split(',') || [];
      assert.ok(extensions.includes('js'));
      assert.ok(!extensions.includes('py'));
    });

    test('should ignore unknown languages in config', () => {
      assert.deepStrictEqual(getSearchGlobs(['unknownlang']), []);
    });
  });
});
