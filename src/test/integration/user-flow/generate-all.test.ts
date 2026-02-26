import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate, getDocUri } from '../helper.js';

suite('generateAll Integration Tests', () => {
  // Helper function to clear all source breakpoints
  function clearAllSourceBreakpoints() {
    vscode.debug.removeBreakpoints(
      vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      )
    );
  }

  suite('Workspace Context', () => {
    test('Single folder - should generate breakpoints from workspace', async () => {
      const uri = getDocUri('generate-all/single-file.ts');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      );

      assert.ok(
        bpsAfter.length > 0,
        `Should have generated breakpoints from workspace, got ${bpsAfter.length}`
      );
    });
  });

  suite('File Matching', () => {
    test('Nested files - should discover files in subdirectories', async () => {
      const uri = getDocUri('generate-all/single-file.ts');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      // Check that we have breakpoints from nested file
      const nestedBps = bpsAfter.filter((bp) =>
        bp.location.uri.fsPath.endsWith('nested-file.ts')
      );

      assert.ok(
        nestedBps.length > 0,
        'Should have found breakpoints in nested directory'
      );
    });

    test('Files without directives - should be correctly ignored', async () => {
      const uri = getDocUri('generate-all/no-directive.ts');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      // no-directive.ts has no @bp comments, should have 0 breakpoints from it
      const noDirectiveBps = bpsAfter.filter(
        (bp) => bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        noDirectiveBps.length,
        0,
        'Should have zero breakpoints from file without directives'
      );
    });
  });

  suite('Breakpoint Collection', () => {
    test('Single breakpoint - file with exactly one directive', async () => {
      const uri = getDocUri('generate-all/single-file.ts');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const singleFileBps = bpsAfter.filter(
        (bp) => bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        singleFileBps.length,
        1,
        'Should have exactly 1 breakpoint from single-file.ts'
      );
    });

    test('Multiple breakpoints - file with multiple directives', async () => {
      const uri = getDocUri('generate-all/multi-bp.ts');
      await activate(uri);

      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      const multiBps = bpsAfter.filter(
        (bp) => bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        multiBps.length,
        3,
        'Should have 3 breakpoints from multi-bp.ts'
      );

      // Verify log messages
      const logMessages = multiBps
        .map((bp) => bp.logMessage)
        .filter(Boolean)
        .sort();
      assert.deepStrictEqual(
        logMessages,
        ['first', 'second', 'third'],
        'Should have correct log messages'
      );
    });
  });

  suite('Refresh Mechanism (State Transition)', () => {
    test('Overwrite existing - should replace existing SourceBreakpoints', async () => {
      const uri = getDocUri('generate-all/single-file.ts');
      await activate(uri);

      clearAllSourceBreakpoints();

      const dummyBp = new vscode.SourceBreakpoint(
        new vscode.Location(uri, new vscode.Position(0, 0))
      );
      vscode.debug.addBreakpoints([dummyBp]);

      const bpsBefore = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      );
      assert.strictEqual(bpsBefore.length, 1, 'Should have 1 dummy breakpoint');

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateAll'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      // Should have replaced dummy breakpoint with newly scanned ones
      const dummyStillExists = bpsAfter.some(
        (bp) =>
          bp.location.uri.toString() === uri.toString() &&
          bp.location.range.start.line === 0 &&
          !bp.logMessage
      );

      assert.strictEqual(
        dummyStillExists,
        false,
        'Dummy breakpoint at line 0 should be removed after generateAll'
      );
      assert.ok(
        bpsAfter.length > 0,
        'Should have breakpoints after generateAll'
      );
    });
  });
});
