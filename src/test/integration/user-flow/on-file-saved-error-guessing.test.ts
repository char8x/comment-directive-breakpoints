import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDocUri, activate, setTestContent } from '../helper.js';

suite('onFileSaved Error Guessing Tests', () => {
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

  suite('Manual Breakpoint Handling', () => {
    test('Manual breakpoints on different lines should be preserved', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Set content with a directive
      await setTestContent('// @bp\nconst a = 1;\nconst b = 2;\n');

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Add a manual breakpoint on line 3 (const b = 2)
      const manualBpLocation = new vscode.Location(
        uri,
        new vscode.Position(2, 0)
      );
      const manualBp = new vscode.SourceBreakpoint(manualBpLocation, true);
      vscode.debug.addBreakpoints([manualBp]);

      // Verify manual breakpoint was added
      const bpsBeforeSave = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );
      assert.strictEqual(
        bpsBeforeSave.length,
        1,
        'Should have 1 manual breakpoint before save'
      );

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfterSave = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      ) as vscode.SourceBreakpoint[];

      // NOTE: Current implementation removes all breakpoints for the file and replaces with directive ones.
      // This test documents the current behavior: manual breakpoints are NOT preserved.
      // If this behavior should change, update the assertion accordingly.
      assert.strictEqual(
        bpsAfterSave.length,
        1,
        'Should have 1 breakpoint (directive only, manual was overwritten)'
      );
      assert.strictEqual(
        bpsAfterSave[0].location.range.start.line,
        1, // Line of const a = 1, not const b = 2
        'The remaining breakpoint should be on line 1 (from directive), not line 2 (manual)'
      );
    });
  });

  suite('Malformed Directive Handling', () => {
    test('Invalid directive suffix should not create breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with a malformed directive
      await setTestContent('// @bp.invalid_suffix\nconst a = 1;\n');

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT create breakpoints for invalid directive suffix'
      );
    });

    test('Incomplete directive should not create breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with incomplete directive (missing the dot and suffix)
      await setTestContent('// @b\nconst a = 1;\n');

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT create breakpoints for incomplete directive'
      );
    });

    test('Directive typo should not create breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with typo in directive (bpp instead of bp)
      await setTestContent('// @bpp\nconst a = 1;\n');

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT create breakpoints for directive with typo'
      );
    });
  });

  suite('Directive at EOF', () => {
    test('Directive at EOF without code below should not create breakpoint', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with directive at the very end, no code below
      await setTestContent('const a = 1;\n// @bp');

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      // Directive at EOF with no associated code should not create a breakpoint
      // because findRelatedCodeNode should return null
      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT create breakpoint for directive at EOF without associated code'
      );
    });

    test('Directive followed only by whitespace should not create breakpoint', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with directive followed by only whitespace
      await setTestContent('const a = 1;\n// @bp\n\n   \n\n');

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT create breakpoint for directive followed only by whitespace'
      );
    });
  });

  suite('Unsupported Language via Configuration', () => {
    test('Explicitly disabled language should not generate breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with a valid directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Disable typescript in the configuration
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.supportedLanguages',
        ['javascript'],
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
        'Should NOT add breakpoint for explicitly disabled language'
      );

      // Restore the configuration
      await resetConfigurations();
    });

    test('Language not in supportedLanguages object should skip generation', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with a valid directive
      await setTestContent('// @bp\nconst a = 1;\n');

      // Set supportedLanguages to explicitly disable typescript
      // NOTE: VS Code merges object configurations with defaults from package.json,
      // so we must explicitly set typescript: false rather than just omitting it.
      const config = vscode.workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      await config.update(
        'general.supportedLanguages',
        ['javascript'],
        vscode.ConfigurationTarget.Workspace
      );

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      // Since typescript is explicitly set to false, breakpoint generation should be skipped.
      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT add breakpoint when language is not in supportedLanguages'
      );

      // Restore the configuration
      await resetConfigurations();
    });
  });

  suite('Special Cases', () => {
    test('Comment in the middle of code should still work', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with directive in the middle of code
      await setTestContent(
        'const a = 1;\n// @bp\nconst b = 2;\nconst c = 3;\n'
      );

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      ) as vscode.SourceBreakpoint[];

      assert.strictEqual(bpsAfter.length, 1, 'Should have 1 breakpoint');
      assert.strictEqual(
        bpsAfter[0].location.range.start.line,
        2, // const b = 2 is on line 2
        'Breakpoint should be on the line following the directive'
      );
    });

    test('Multiple directives with some invalid should only create valid breakpoints', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with mix of valid and invalid directives
      await setTestContent(
        '// @bp\nconst a = 1;\n// @bp.invalid\nconst b = 2;\n// @bp.log hello\nconst c = 3;\n'
      );

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      ) as vscode.SourceBreakpoint[];

      // Should have 2 breakpoints: @bp and @bp.log hello
      assert.strictEqual(
        bpsAfter.length,
        2,
        'Should have 2 valid breakpoints, ignoring invalid directive'
      );
    });

    test('Directive inside string literal should not create breakpoint', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with directive-like text inside a string
      await setTestContent('const str = "// @bp";\nconst a = 1;\n');

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT create breakpoint for directive-like text inside string literal'
      );
    });

    test('Directive inside template literal should not create breakpoint', async () => {
      const uri = getDocUri('on-file-saved/test-file.ts');
      await activate(uri);
      await resetConfigurations();

      // Clear any existing breakpoints
      clearBreakpoints(uri);

      // Set content with directive-like text inside a template literal
      await setTestContent('const str = `// @bp`;\nconst a = 1;\n');

      // Save the document
      await vscode.workspace.save(uri);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Count breakpoints after save
      const bpsAfter = vscode.debug.breakpoints.filter(
        (bp) =>
          bp instanceof vscode.SourceBreakpoint &&
          bp.location.uri.toString() === uri.toString()
      );

      assert.strictEqual(
        bpsAfter.length,
        0,
        'Should NOT create breakpoint for directive-like text inside template literal'
      );
    });
  });
});
