import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate, getDocUri } from '../helper.js';

suite('generateAll Error Guessing Tests', () => {
  // Helper function to clear all source breakpoints
  function clearAllSourceBreakpoints() {
    vscode.debug.removeBreakpoints(
      vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      )
    );
  }

  suite('Workspace Context', () => {
    test('Empty workspace folder - should not crash or error', async () => {
      // We can't truly test "no workspace" or "empty workspace" in integration tests
      // since we're running within a workspace. Instead, we verify the command
      // executes without throwing when no matching files are found
      const uri = getDocUri('generate-all-error-guessing/test.tsx');
      await activate(uri);

      clearAllSourceBreakpoints();

      // This should not throw even if some folders have no matchable files
      await assert.doesNotReject(async () => {
        await vscode.commands.executeCommand(
          'comment-directive-breakpoints.generateAll'
        );
      }, 'generateAll should not throw for any workspace state');
    });
  });

  suite('File Scanning & Filtering', () => {
    test('.mts files - should be scanned for breakpoints', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.mts');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const mtsBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.includes('test.mts')
      );

      assert.ok(
        mtsBps.length > 0,
        `Should have breakpoints from .mts file, got ${mtsBps.length}`
      );
    });

    test('.cts files - should be scanned for breakpoints', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.cts');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const ctsBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.includes('test.cts')
      );

      assert.ok(
        ctsBps.length > 0,
        `Should have breakpoints from .cts file, got ${ctsBps.length}`
      );
    });

    test('.jsx files - should be scanned for breakpoints', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.jsx');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const jsxBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.includes('test.jsx')
      );

      assert.ok(
        jsxBps.length > 0,
        `Should have breakpoints from .jsx file, got ${jsxBps.length}`
      );
    });

    test('.tsx files - should be scanned for breakpoints', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.tsx');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const tsxBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.includes('test.tsx')
      );

      assert.ok(
        tsxBps.length > 0,
        `Should have breakpoints from .tsx file, got ${tsxBps.length}`
      );
    });

    test('.html files - should be ignored even with @bp comment', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.tsx');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const htmlBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.includes('.html')
      );

      assert.strictEqual(
        htmlBps.length,
        0,
        'Should have 0 breakpoints from .html files'
      );
    });

    test('.css files - should be ignored even with @bp comment', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.tsx');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const cssBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.includes('.css')
      );

      assert.strictEqual(
        cssBps.length,
        0,
        'Should have 0 breakpoints from .css files'
      );
    });
  });

  suite('Breakpoint Lifecycle', () => {
    test('FunctionBreakpoints - should be preserved during generateAll', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.tsx');
      await activate(uri);

      clearAllSourceBreakpoints();

      // Add a FunctionBreakpoint
      const functionBp = new vscode.FunctionBreakpoint('testFunction');
      vscode.debug.addBreakpoints([functionBp]);

      const functionBpsBefore = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.FunctionBreakpoint
      );
      assert.strictEqual(
        functionBpsBefore.length,
        1,
        'Should have 1 function breakpoint before'
      );

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const functionBpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.FunctionBreakpoint
      );

      assert.strictEqual(
        functionBpsAfter.length,
        1,
        'FunctionBreakpoints should be preserved after generateAll'
      );

      // Cleanup
      vscode.debug.removeBreakpoints(functionBpsAfter);
    });

    test('Global refresh - should remove breakpoints from files without directives', async () => {
      const uri = getDocUri('generate-all-error-guessing/test.tsx');
      await activate(uri);

      clearAllSourceBreakpoints();

      // Add a breakpoint to a file that has no @bp directive
      const noDirectiveUri = getDocUri('generate-all/no-directive.ts');
      const fakeBp = new vscode.SourceBreakpoint(
        new vscode.Location(noDirectiveUri, new vscode.Position(0, 0))
      );
      vscode.debug.addBreakpoints([fakeBp]);

      const bpsBefore = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.fsPath.includes('no-directive.ts')
      );
      assert.strictEqual(
        bpsBefore.length,
        1,
        'Should have 1 breakpoint in no-directive.ts before'
      );

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.fsPath.includes('no-directive.ts')
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Breakpoints should be removed from files without directives after generateAll'
      );
    });
  });

  suite('Content Robustness', () => {
    test('Malformed directives - should skip invalid directives without crashing', async () => {
      const uri = getDocUri('generate-all-error-guessing/malformed.ts');
      await activate(uri);

      clearAllSourceBreakpoints();

      // Should not throw even with malformed directives
      await assert.doesNotReject(async () => {
        await vscode.commands.executeCommand(
          'comment-directive-breakpoints.generateAll'
        );
      }, 'generateAll should not throw on malformed directives');

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      // Should still have valid breakpoints from the valid @bp in malformed.ts
      const malformedFileBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.includes('malformed.ts')
      );

      assert.ok(
        malformedFileBps.length >= 1,
        `Should have at least 1 valid breakpoint from malformed.ts, got ${malformedFileBps.length}`
      );
    });
  });
});
