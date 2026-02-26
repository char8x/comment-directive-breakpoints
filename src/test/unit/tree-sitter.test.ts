import { suite, test } from 'vitest';
import * as assert from 'node:assert';
import dedent from 'dedent';
import { CommentTree } from '../../lib/commentTree.js';

suite('Test Tree Sitter', () => {
  test('test', async () => {
    const text = `// test comment`;
    const tree = CommentTree.create('javascript', text);
    await tree.build();
    assert.strictEqual(tree.comments.length, 1);
  });

  test('test 2', async () => {
    const source = dedent`
      // single line comment
      const x = 1; // inline comment
      /* block comment */
      const y = /* inline block */ 2;
    `;

    const tree = CommentTree.create('javascript', source);
    await tree.build();

    assert.strictEqual(tree.comments.length, 4);
    assert.strictEqual(tree.comments.at(0)?.kind(), 'comment');
    assert.strictEqual(tree.comments.at(0)?.text(), '// single line comment');
    assert.strictEqual(tree.comments.at(3)?.text(), '/* inline block */');
  });
});
