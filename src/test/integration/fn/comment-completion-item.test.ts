import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDocUri, activate, setTestContent } from '../helper.js';

suite('CommentCompletionItem - Property Tests', () => {
  const docUri = getDocUri('languages/sample-a.ts');

  async function getCompletions(position: vscode.Position) {
    return (await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      docUri,
      position
    )) as vscode.CompletionList;
  }

  function findByLabel(
    items: vscode.CompletionItem[],
    label: string
  ): vscode.CompletionItem | undefined {
    return items.find((it) =>
      typeof it.label === 'string'
        ? it.label === label
        : it.label.label === label
    );
  }

  suite('1. insertText', () => {
    test('1.1 Schema with placeholder — strips ${...} markers', async () => {
      await activate(docUri);
      await setTestContent('// @bp.');
      const position = new vscode.Position(0, 7);
      const completions = await getCompletions(position);

      const hitItem = findByLabel(completions.items, '// @bp.hit');
      assert.ok(hitItem, 'Should find // @bp.hit completion');
      const text =
        typeof hitItem.insertText === 'string'
          ? hitItem.insertText
          : hitItem.insertText?.value;
      assert.strictEqual(
        text,
        '// @bp.hit condition',
        'insertText should have placeholder markers stripped'
      );
    });

    test('1.2 Schema without placeholder — insertText equals label', async () => {
      await activate(docUri);
      await setTestContent('// @bp.');
      const position = new vscode.Position(0, 7);
      const completions = await getCompletions(position);

      const disableItem = findByLabel(completions.items, '// @bp.disable');
      assert.ok(disableItem, 'Should find // @bp.disable completion');
      const text =
        typeof disableItem.insertText === 'string'
          ? disableItem.insertText
          : disableItem.insertText?.value;
      assert.strictEqual(
        text,
        '// @bp.disable',
        'insertText should equal the schema text (no placeholder)'
      );
    });
  });

  suite('2. range', () => {
    test('2.1 Range start covers the matched prefix', async () => {
      await activate(docUri);
      await setTestContent('// @bp.');
      const position = new vscode.Position(0, 7);
      const completions = await getCompletions(position);

      const hitItem = findByLabel(completions.items, '// @bp.hit');
      assert.ok(hitItem, 'Should find // @bp.hit completion');

      const range = hitItem.range;
      // range can be a Range or { inserting, replacing }
      const actualRange =
        range instanceof vscode.Range
          ? range
          : (range as { inserting: vscode.Range; replacing: vscode.Range })
              ?.replacing;
      assert.ok(actualRange, 'Completion item should have a range');
      assert.strictEqual(
        actualRange.start.character,
        0,
        'Range start should cover back to the beginning of the prefix'
      );
    });

    test('2.2 `// @bp.hit > 5` — hit range ends at cursor, preserving trailing ` > 5`', async () => {
      await activate(docUri);
      await setTestContent('// @bp.hit > 5');
      const position = new vscode.Position(0, 10); // cursor at "// @bp.hit"
      const completions = await getCompletions(position);

      const hitItem = findByLabel(completions.items, '// @bp.hit');
      assert.ok(hitItem, 'Should find // @bp.hit completion');

      // insertText should NOT include placeholder text like "condition"
      const text =
        typeof hitItem.insertText === 'string'
          ? hitItem.insertText
          : hitItem.insertText?.value;
      assert.strictEqual(
        text,
        '// @bp.hit',
        'insertText should be just "// @bp.hit" without placeholder text'
      );

      // Range end should stay at cursor so trailing " > 5" is preserved
      const range = hitItem.range;
      const actualRange =
        range instanceof vscode.Range
          ? range
          : (range as { inserting: vscode.Range; replacing: vscode.Range })
              ?.replacing;
      assert.ok(actualRange, 'Completion item should have a range');
      assert.strictEqual(
        actualRange.end.character,
        position.character,
        'Range end should equal cursor position so trailing " > 5" is kept'
      );
    });

    test('2.3 Range end stays at cursor for schemas without placeholder', async () => {
      await activate(docUri);
      await setTestContent('// @bp.');
      const position = new vscode.Position(0, 7);
      const completions = await getCompletions(position);

      const disableItem = findByLabel(completions.items, '// @bp.disable');
      assert.ok(disableItem, 'Should find // @bp.disable completion');

      const range = disableItem.range;
      const actualRange =
        range instanceof vscode.Range
          ? range
          : (range as { inserting: vscode.Range; replacing: vscode.Range })
              ?.replacing;
      assert.ok(actualRange, 'Completion item should have a range');
      assert.strictEqual(
        actualRange.end.character,
        position.character,
        'Range end should equal cursor position for non-placeholder schemas'
      );
    });

    test('2.4 `// @bp.hit. > 2` — hit.disable range ends at cursor, preserving trailing ` > 2`', async () => {
      await activate(docUri);
      // Simulate: user had `// @bp.hit > 2`, then typed a dot → `// @bp.hit. > 2`
      await setTestContent('// @bp.hit. > 2');
      const position = new vscode.Position(0, 11); // cursor right after "// @bp.hit."
      const completions = await getCompletions(position);

      const disableItem = findByLabel(completions.items, '// @bp.hit.disable');
      assert.ok(disableItem, 'Should find // @bp.hit.disable completion');

      // insertText should NOT include a placeholder suffix like "condition"
      const text =
        typeof disableItem.insertText === 'string'
          ? disableItem.insertText
          : disableItem.insertText?.value;
      assert.strictEqual(
        text,
        '// @bp.hit.disable',
        'insertText should be just "// @bp.hit.disable" without placeholder text'
      );

      // Range end should stay at cursor (not extend to end-of-line),
      // so that the existing " > 2" is preserved after completion.
      const range = disableItem.range;
      const actualRange =
        range instanceof vscode.Range
          ? range
          : (range as { inserting: vscode.Range; replacing: vscode.Range })
              ?.replacing;
      assert.ok(actualRange, 'Completion item should have a range');
      assert.strictEqual(
        actualRange.end.character,
        position.character,
        'Range end should equal cursor position so trailing " > 2" is kept'
      );
    });

    test('2.5 `// @bp.log > 5` — log range ends at cursor, preserving trailing ` > 5`', async () => {
      await activate(docUri);
      await setTestContent('// @bp.log > 5');
      const position = new vscode.Position(0, 10); // cursor at "// @bp.log"
      const completions = await getCompletions(position);

      const logItem = findByLabel(completions.items, '// @bp.log');
      assert.ok(logItem, 'Should find // @bp.log completion');

      const text =
        typeof logItem.insertText === 'string'
          ? logItem.insertText
          : logItem.insertText?.value;
      assert.strictEqual(
        text,
        '// @bp.log',
        'insertText should be just "// @bp.log" without placeholder text'
      );

      const range = logItem.range;
      const actualRange =
        range instanceof vscode.Range
          ? range
          : (range as { inserting: vscode.Range; replacing: vscode.Range })
              ?.replacing;
      assert.ok(actualRange, 'Completion item should have a range');
      assert.strictEqual(
        actualRange.end.character,
        position.character,
        'Range end should equal cursor position so trailing " > 5" is kept'
      );
    });

    test('2.6 `// @bp.expr > 5` — expr range ends at cursor, preserving trailing ` > 5`', async () => {
      await activate(docUri);
      await setTestContent('// @bp.expr > 5');
      const position = new vscode.Position(0, 11); // cursor at "// @bp.expr"
      const completions = await getCompletions(position);

      const exprItem = findByLabel(completions.items, '// @bp.expr');
      assert.ok(exprItem, 'Should find // @bp.expr completion');

      const text =
        typeof exprItem.insertText === 'string'
          ? exprItem.insertText
          : exprItem.insertText?.value;
      assert.strictEqual(
        text,
        '// @bp.expr',
        'insertText should be just "// @bp.expr" without placeholder text'
      );

      const range = exprItem.range;
      const actualRange =
        range instanceof vscode.Range
          ? range
          : (range as { inserting: vscode.Range; replacing: vscode.Range })
              ?.replacing;
      assert.ok(actualRange, 'Completion item should have a range');
      assert.strictEqual(
        actualRange.end.character,
        position.character,
        'Range end should equal cursor position so trailing " > 5" is kept'
      );
    });
  });

  suite('3. command', () => {
    test('3.1 Schema with placeholder — sets focus command', async () => {
      await activate(docUri);
      await setTestContent('// @bp.');
      const position = new vscode.Position(0, 7);
      const completions = await getCompletions(position);

      const hitItem = findByLabel(completions.items, '// @bp.hit');
      assert.ok(hitItem, 'Should find // @bp.hit completion');
      assert.ok(hitItem.command, 'Should have a command for placeholder schema');
      assert.strictEqual(
        hitItem.command.command,
        'comment-directive-breakpoints.comment-autocomplete.focus',
        'Command should be the focus command'
      );
    });

    test('3.2 Schema without placeholder — no command', async () => {
      await activate(docUri);
      await setTestContent('// @bp.');
      const position = new vscode.Position(0, 7);
      const completions = await getCompletions(position);

      const disableItem = findByLabel(completions.items, '// @bp.disable');
      assert.ok(disableItem, 'Should find // @bp.disable completion');
      assert.strictEqual(
        disableItem.command,
        undefined,
        'Should not have a command for non-placeholder schema'
      );
    });
  });
});
