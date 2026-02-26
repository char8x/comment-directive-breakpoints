import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDocUri, activate, setTestContent, editor } from '../helper.js';

suite('Comment Completion Test Suite', () => {
  const docUri = getDocUri('languages/sample-a.ts');

  async function getCompletions(position: vscode.Position) {
    return (await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      docUri,
      position
    )) as vscode.CompletionList;
  }

  test('Suggests @bp when typing "// "', async () => {
    await activate(docUri);
    await setTestContent('// ');
    const position = new vscode.Position(0, 3);
    const actualCompletions = await getCompletions(position);

    assert.ok(actualCompletions.items.length > 0, 'Should have completions');
    const labels = actualCompletions.items.map((it) =>
      typeof it.label === 'string' ? it.label : it.label.label
    );
    assert.ok(labels.includes('// @bp'), 'Should include // @bp');
    assert.ok(labels.includes('// @bp.log'), 'Should include // @bp.log');
  });

  test('Suggests hierarchical bp. hit when typing "// @"', async () => {
    await activate(docUri);
    await setTestContent('// @');
    const position = new vscode.Position(0, 4);
    const actualCompletions = await getCompletions(position);

    const labels = actualCompletions.items.map((it) =>
      typeof it.label === 'string' ? it.label : it.label.label
    );
    assert.ok(labels.includes('// @bp.hit'), 'Should include // @bp.hit');
    assert.ok(labels.includes('// @bp.log'), 'Should include // @bp.log');
  });

  test('Suggests hierarchical p.hit when typing "// @b"', async () => {
    await activate(docUri);
    await setTestContent('// @b');
    const position = new vscode.Position(0, 5);
    const actualCompletions = await getCompletions(position);

    const labels = actualCompletions.items.map((it) =>
      typeof it.label === 'string' ? it.label : it.label.label
    );
    assert.ok(labels.includes('// @bp.hit'), 'Should include // @bp.hit');
  });

  test('Suggests hierarchical .hit when typing "// @bp"', async () => {
    await activate(docUri);
    await setTestContent('// @bp');
    const position = new vscode.Position(0, 6);
    const actualCompletions = await getCompletions(position);

    const labels = actualCompletions.items.map((it) =>
      typeof it.label === 'string' ? it.label : it.label.label
    );
    assert.ok(labels.includes('// @bp.hit'), 'Should include // @bp.hit');
  });

  test('Suggests sub-properties when typing "// @bp."', async () => {
    await activate(docUri);
    await setTestContent('// @bp.');
    const position = new vscode.Position(0, 7);
    const actualCompletions = await getCompletions(position);

    const labels = actualCompletions.items.map((it) =>
      typeof it.label === 'string' ? it.label : it.label.label
    );
    assert.ok(labels.includes('// @bp.hit'), 'Should include // @bp.hit');
    assert.ok(
      labels.includes('// @bp.disable'),
      'Should include // @bp.disable'
    );
  });

  test('Suggests disable when typing "// @bp.hit."', async () => {
    await activate(docUri);
    await setTestContent('// @bp.hit.');
    const position = new vscode.Position(0, 11);
    const actualCompletions = await getCompletions(position);

    const labels = actualCompletions.items.map((it) =>
      typeof it.label === 'string' ? it.label : it.label.label
    );

    assert.ok(
      labels.includes('// @bp.hit.disable'),
      'Should include // @bp.hit.disable'
    );
  });

  test('Suggests in indented line', async () => {
    await activate(docUri);
    await setTestContent('  // @bp.');
    const position = new vscode.Position(0, 9);
    const actualCompletions = await getCompletions(position);

    assert.ok(
      actualCompletions.items.length > 0,
      'Should have completions in indented line'
    );
  });

  test('Suggests after code', async () => {
    await activate(docUri);
    await setTestContent('const a = 1; // @bp.');
    const position = new vscode.Position(0, 20);
    const actualCompletions = await getCompletions(position);

    assert.ok(
      actualCompletions.items.length > 0,
      'Should have completions after code'
    );
  });

  test('Should NOT suggest inside string', async () => {
    await activate(docUri);
    await setTestContent('const s = "// @bp.";');
    const position = new vscode.Position(0, 18);
    const actualCompletions = await getCompletions(position);
    const myCompletions = actualCompletions.items.filter((it) =>
      typeof it.label === 'string'
        ? it.label.includes('@bp')
        : it.label.label.includes('@bp')
    );

    assert.strictEqual(
      myCompletions.length,
      0,
      'Should NOT have @bp completions inside string'
    );
  });

  test('Suggests variables in @bp.expr', async () => {
    await activate(docUri);
    await setTestContent(
      'const message = "hello";\n// @bp.expr \nconst y = 1;'
    );
    const position = new vscode.Position(1, 12); // at the end of '// @bp.expr '
    const actualCompletions = await getCompletions(position);

    const labels = actualCompletions.items.map((it) =>
      typeof it.label === 'string' ? it.label : it.label.label
    );
    assert.ok(labels.includes('message'), 'Should include "message" variable');
  });
});
