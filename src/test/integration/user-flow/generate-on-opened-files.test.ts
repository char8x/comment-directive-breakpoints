import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate, getDocUri } from '../helper.js';

suite('generateOnOpenedFiles Integration Tests', () => {
  // Helper function to clear all source breakpoints
  function clearAllSourceBreakpoints() {
    vscode.debug.removeBreakpoints(
      vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      )
    );
  }

  // Helper to close all editors
  async function closeAllEditors() {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  suite('Tab Count', () => {
    test('Zero tabs - should handle gracefully', async () => {
      await closeAllEditors();
      clearAllSourceBreakpoints();

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateOnOpenedFiles'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should have zero breakpoints when no tabs are open'
      );
    });

    test('Single tab - file with breakpoint', async () => {
      await closeAllEditors();
      clearAllSourceBreakpoints();

      const uri = getDocUri('generate-on-opened/has-bp.ts');
      await activate(uri);

      // Wait for the editor to fully load
      await new Promise((resolve) => setTimeout(resolve, 200));

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateOnOpenedFiles'
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      assert.strictEqual(
        bpsAfter.length,
        1,
        'Should have 1 breakpoint from the single opened file'
      );
    });

    test('Multiple tabs - files with various breakpoints', async () => {
      await closeAllEditors();
      clearAllSourceBreakpoints();

      const uri1 = getDocUri('generate-on-opened/has-bp.ts');
      const uri2 = getDocUri('generate-on-opened/multi-bp.ts');
      await activate(uri1);
      await vscode.workspace.openTextDocument(uri2);
      await vscode.window.showTextDocument(uri2, { preview: false });

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateOnOpenedFiles'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      // 1 from has-bp.ts + 3 from multi-bp.ts = 4
      assert.strictEqual(
        bpsAfter.length,
        4,
        'Should have 4 breakpoints from both opened files'
      );
    });
  });

  suite('File Type', () => {
    test('Unsupported file type - should be ignored', async () => {
      await closeAllEditors();
      clearAllSourceBreakpoints();

      const uri = getDocUri('generate-on-opened/unsupported.json');
      await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(uri, { preview: false });

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateOnOpenedFiles'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should have zero breakpoints from unsupported file type'
      );
    });

    test('Mixed supported and unsupported - only supported processed', async () => {
      await closeAllEditors();
      clearAllSourceBreakpoints();

      const supportedUri = getDocUri('generate-on-opened/has-bp.ts');
      const unsupportedUri = getDocUri('generate-on-opened/unsupported.json');
      await activate(supportedUri);
      await vscode.workspace.openTextDocument(unsupportedUri);
      await vscode.window.showTextDocument(unsupportedUri, { preview: false });

      // Wait for both files to load
      await new Promise((resolve) => setTimeout(resolve, 200));

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateOnOpenedFiles'
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      assert.strictEqual(
        bpsAfter.length,
        1,
        'Should only have 1 breakpoint from the supported file'
      );
    });
  });

  suite('Directive Content', () => {
    test('File without directives - should generate zero breakpoints', async () => {
      await closeAllEditors();
      clearAllSourceBreakpoints();

      const uri = getDocUri('generate-on-opened/no-bp.ts');
      await activate(uri);

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateOnOpenedFiles'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should have zero breakpoints from file without directives'
      );
    });
  });

  suite('Breakpoint Cleanup (State Transition)', () => {
    test('Should replace existing SourceBreakpoints', async () => {
      await closeAllEditors();
      clearAllSourceBreakpoints();

      const uri = getDocUri('generate-on-opened/has-bp.ts');
      await activate(uri);

      // Add a dummy breakpoint
      const dummyBp = new vscode.SourceBreakpoint(
        new vscode.Location(uri, new vscode.Position(0, 0))
      );
      vscode.debug.addBreakpoints([dummyBp]);

      const bpsBefore = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      );
      assert.strictEqual(bpsBefore.length, 1, 'Should have 1 dummy breakpoint');

      await vscode.commands.executeCommand(
        'comment-directive-breakpoints.generateOnOpenedFiles'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint
      ) as vscode.SourceBreakpoint[];

      // Dummy should be removed, only the real one from the file should remain
      const dummyStillExists = bpsAfter.some(
        (bp) =>
          bp.location.uri.toString() === uri.toString() &&
          bp.location.range.start.line === 0 &&
          !bp.logMessage
      );

      assert.strictEqual(
        dummyStillExists,
        false,
        'Dummy breakpoint at line 0 should be removed after generateOnOpenedFiles'
      );
      assert.ok(
        bpsAfter.length === 1,
        'Should have 1 breakpoint after generateOnOpenedFiles'
      );
    });
  });
});
