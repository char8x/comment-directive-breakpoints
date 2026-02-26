import * as assert from 'assert';
import * as vscode from 'vscode';
import { extractBreakpoints } from '../../../lib/vscode.js';
import { getDocUri, activate } from '../helper.js';

suite('extractBreakpoints Integration Tests', () => {
  suite('Directive Types', () => {
    test('@bp - basic breakpoint', async () => {
      const uri = getDocUri('directive-types/basic.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, true);
      assert.strictEqual(breakpoints[0].condition, undefined);
      assert.strictEqual(breakpoints[0].hitCondition, undefined);
      assert.strictEqual(breakpoints[0].logMessage, undefined);
    });

    test('@bp.expr - expression condition', async () => {
      const uri = getDocUri('directive-types/expr.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, true);
      assert.strictEqual(breakpoints[0].condition, 'a > 1');
    });

    test('@bp.hit - hit count condition', async () => {
      const uri = getDocUri('directive-types/hit.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, true);
      assert.strictEqual(breakpoints[0].hitCondition, '5');
    });

    test('@bp.log - log message', async () => {
      const uri = getDocUri('directive-types/log.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, true);
      assert.strictEqual(breakpoints[0].logMessage, 'hello world');
    });

    test('@bp.disable - disabled breakpoint', async () => {
      const uri = getDocUri('directive-types/disable.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, false);
    });

    test('@bp.expr.disable - disabled expression', async () => {
      const uri = getDocUri('directive-types/expr-disable.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, false);
      assert.strictEqual(breakpoints[0].condition, 'x');
    });
  });

  suite('Structural Placement', () => {
    test('line comment above code', async () => {
      const uri = getDocUri('placement/line-comment.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      // Breakpoint should be on the code line, not the comment line
      assert.strictEqual(breakpoints[0].location.range.start.line, 1);
    });

    test('multiple line comments - last one wins', async () => {
      const uri = getDocUri('placement/multiple-line.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      // The last @bp C should be used
      assert.strictEqual(breakpoints[0].logMessage, 'C');
    });

    test('inline comment only (no line comment above)', async () => {
      const uri = getDocUri('placement/inline-comment.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
    });

    test('line + inline - line comment triggers breakpoint', async () => {
      const uri = getDocUri('placement/line-and-inline.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].logMessage, 'inline');
    });

    test('dangling comment - no breakpoint', async () => {
      const uri = getDocUri('placement/dangling.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 0, 'Should have no breakpoints');
    });

    test('for loop last line - no breakpoint', async () => {
      const uri = getDocUri('placement/for-loop.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 0, 'Should have no breakpoints');
    });
  });

  suite('Language Coverage', () => {
    test('javascript file', async () => {
      const uri = getDocUri('languages/sample-b.js');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'javascript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, true);
    });

    test('typescript file', async () => {
      const uri = getDocUri('languages/sample-a.ts');
      await activate(uri);
      const breakpoints = await extractBreakpoints(uri, 'typescript');

      assert.strictEqual(breakpoints.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(breakpoints[0].enabled, true);
    });
  });
});
