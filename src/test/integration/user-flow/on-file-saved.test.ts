import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDocUri, activate, setTestContent } from '../helper.js';

suite('onFileSaved Integration Tests', () => {
  // Helper function to reset all configurations to default
  async function resetConfigurations() {
    const config = vscode.workspace.getConfiguration(
      'comment-directive-breakpoints'
    );
    await config.update(
      'general.supportedLanguages',
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
    await config.update(
      'general.generateOnSave',
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
    await config.update(
      'general.breakpointManagementMode',
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
  }

  // Helper function to clear breakpoints for a given URI
  function clearBreakpoints(uri: vscode.Uri) {
    vscode.debug.removeBreakpoints(
      vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      )
    );
  }

  suite('Language Support', () => {
    test('Enabled language - should generate breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Get the configuration and ensure typescript is enabled
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      const supportedLanguages = config.get<string[]>(
        'general.supportedLanguages'
      );
      assert.ok(
        supportedLanguages?.includes('typescript'),
        'TypeScript should be enabled'
      );

      // Count breakpoints before save
      const bpsBefore = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      // Save the document
      await vscode.workspace.save(uri);

      // Wait for the onDidSaveTextDocument event to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.ok(
        bpsAfter.length > bpsBefore.length,
        'Should have added breakpoint for enabled language'
      );
    });

    test('Disabled language - should NOT generate breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Disable typescript in the configuration
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.supportedLanguages',
        [
          'javascript',
          'javascriptreact',
          'typescriptreact',
          'python',
          'go',
          'ruby',
          'java',
          'rust',
        ],
        vscode.ConfigurationTarget.Workspace
      );

      // Count breakpoints before save
      const bpsBefore = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      // Save the document
      await vscode.workspace.save(uri);

      // Wait for the onDidSaveTextDocument event to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        bpsBefore.length,
        'Should NOT add breakpoint for disabled language'
      );

      // Restore the configuration
      await resetConfigurations();
    });
  });

  suite('Auto-generate Toggle', () => {
    test('generateOnSave enabled - should generate breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Reset configurations to ensure clean state
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Ensure generateOnSave is enabled (should be true by default, but set explicitly)
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.generateOnSave',
        true,
        vscode.ConfigurationTarget.Workspace
      );

      // Count breakpoints before save
      const bpsBefore = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      // Save the document
      await vscode.workspace.save(uri);

      // Wait for the onDidSaveTextDocument event to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.ok(
        bpsAfter.length > bpsBefore.length,
        'Should have added breakpoint when generateOnSave is enabled'
      );
    });

    test('generateOnSave disabled - should NOT generate breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Disable generateOnSave
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.generateOnSave',
        false,
        vscode.ConfigurationTarget.Workspace
      );

      // Count breakpoints before save
      const bpsBefore = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      // Save the document
      await vscode.workspace.save(uri);

      // Wait for the onDidSaveTextDocument event to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        bpsBefore.length,
        'Should NOT add breakpoint when generateOnSave is disabled'
      );

      // Restore the configuration
      await resetConfigurations();
    });
  });

  suite('Breakpoint Management', () => {
    test('New directive - should add new breakpoint', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Ensure no breakpoints exist for this file
      vscode.debug.removeBreakpoints(
        vscode.debug.breakpoints.filter(
          (bp) =>
            bp instanceof vscode.SourceBreakpoint &&
            bp.location.uri.toString() === uri.toString()
        )
      );

      // Save the document
      await vscode.workspace.save(uri);

      // Wait for the onDidSaveTextDocument event to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        1,
        'Should have added 1 new breakpoint'
      );
    });

    test('Update directive - should replace breakpoint', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Set configuration to 'replace'
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.breakpointManagementMode',
        'replace',
        vscode.ConfigurationTarget.Workspace
      );

      // Set initial content with a directive
      await setTestContent('// @bp.log hello\nconst a = 1;\n');

      // Save the document to create initial breakpoint
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bpsAfterFirst = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      ) as vscode.SourceBreakpoint[];

      assert.strictEqual(bpsAfterFirst.length, 1);
      assert.strictEqual(bpsAfterFirst[0].logMessage, 'hello');

      // Update the directive
      await setTestContent('// @bp.log world\nconst a = 1;\n');

      // Save again
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bpsAfterSecond = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      ) as vscode.SourceBreakpoint[];

      assert.strictEqual(bpsAfterSecond.length, 1);
      assert.strictEqual(
        bpsAfterSecond[0].logMessage,
        'world',
        'Should have updated the log message'
      );
    });

    test('Delete directive - should remove breakpoint', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Set configuration to 'replace'
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.breakpointManagementMode',
        'replace',
        vscode.ConfigurationTarget.Workspace
      );

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Save the document to create breakpoint
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bpsAfterFirst = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(bpsAfterFirst.length, 1, 'Should have 1 breakpoint');

      // Remove the directive
      await setTestContent('const a = 1;\n');

      // Save again
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bpsAfterSecond = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfterSecond.length,
        0,
        'Should have removed the breakpoint'
      );
    });
  });

  suite('Boundary Value Analysis', () => {
    test('Empty file - should remove all breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Set configuration to 'replace'
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.breakpointManagementMode',
        'replace',
        vscode.ConfigurationTarget.Workspace
      );

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Save to create breakpoint
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bpsAfterFirst = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(bpsAfterFirst.length, 1, 'Should have 1 breakpoint');

      // Empty the file
      await setTestContent('');

      // Save again
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bpsAfterSecond = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfterSecond.length,
        0,
        'Should have removed all breakpoints for empty file'
      );
    });

    test('Multiple directives - should add multiple breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Set content with multiple directives
      await setTestContent(
        '// @bp.log first\nconst a = 1;\n\n// @bp.log second\nconst b = 2;\n\n// @bp.log third\nconst c = 3;\n'
      );

      // Ensure no breakpoints exist for this file
      vscode.debug.removeBreakpoints(
        vscode.debug.breakpoints.filter(
          (bp) =>
            bp instanceof vscode.SourceBreakpoint &&
            bp.location.uri.toString() === uri.toString()
        )
      );

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      ) as vscode.SourceBreakpoint[];

      assert.strictEqual(bpsAfter.length, 3, 'Should have added 3 breakpoints');

      // Verify all log messages
      const logMessages = bpsAfter.map((bp) => bp.logMessage).sort();
      assert.deepStrictEqual(
        logMessages,
        ['first', 'second', 'third'],
        'Should have correct log messages'
      );
    });
  });
});
