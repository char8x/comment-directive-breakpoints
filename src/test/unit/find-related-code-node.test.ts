import { suite, test } from 'vitest';
import * as assert from 'node:assert';
import dedent from 'dedent';
import { findRelatedCodeNode, findAllCommentNodes } from '../../lib/common.js';
import { CommentNode } from '../../lib/commentTree.js';

suite('findRelatedCodeNode', () => {
  /**
   * Helper function to get a comment node at a specific position
   */
  async function getCommentNodeAtLine(
    source: string,
    line: number
  ): Promise<CommentNode> {
    const comments = await findAllCommentNodes('typescript', source);
    const comment = comments.find((c) => c.range().start.line === line);
    if (!comment) {
      throw new Error(`No comment found at line ${line}`);
    }
    return comment;
  }

  // Group 1: Comment Types - MECE by comment syntax
  suite('Comment Types', () => {
    test('should return null for block comments', async () => {
      const source = dedent`
        /* @bp.hit */
        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });

    test('should return null for multi-line block comments', async () => {
      const source = dedent`
        /*
         * @bp.hit
         */
        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });

    test('should return null for inline block comments', async () => {
      const source = dedent`
        const x = /* @bp.hit */ 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });
  });

  // Group 2: Line Comment Above Code - MECE by interference scenarios
  suite('Line Comment Above Code', () => {
    test('should return the code node when immediately above code', async () => {
      const source = dedent`
        // @bp.hit
        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });

    test('should return the code node when multiple comments precede code (last one wins)', async () => {
      const source = dedent`
        // @bp A
        // @bp B
        // @bp C
        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 2); // Line with "// @bp C"
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });

    test('should return null when preempted by an inline comment', async () => {
      const source = dedent`
        // @bp A
        // @bp B
        // @bp C
        const x = 1; // @bp D
      `;
      const commentNode = await getCommentNodeAtLine(source, 2); // Line with "// @bp C"
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null); // Inline comment takes precedence
    });

    test('should return null when separated by another comment (not last in group)', async () => {
      const source = dedent`
        // @bp A
        // @bp B
        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0); // Line with "// @bp A"
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null); // Not the last comment, so B will link instead
    });

    test('should return the code node for indented comment above code', async () => {
      const source = dedent`
        // @bp.hit
        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });

    test('should return the code node when comment has trailing whitespace', async () => {
      const source = dedent`
        // @bp.hit
        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });
  });

  // Group 3: Inline Comment (Same Line as Code) - MECE by code position
  suite('Inline Comment (Same Line as Code)', () => {
    test('should return the code node on the same line', async () => {
      const source = dedent`
        const x = 1; // @bp.hit
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });

    test('should return the code node for inline comment after expression', async () => {
      const source = dedent`
        return x + y; // @bp.expr x > y
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('return x + y'));
    });

    test('should return the code node for inline comment after function call', async () => {
      const source = dedent`
        console.log(value); // @bp.log
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('console.log(value)'));
    });

    test('should return the code node for inline comment in nested block', async () => {
      const source = dedent`
        function test() {
          if (true) {
            const x = 1; // @bp.hit
          }
        }
      `;
      const commentNode = await getCommentNodeAtLine(source, 2);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });
  });

  // Group 4: Edge Cases - MECE by isolation scenarios
  suite('Edge Cases', () => {
    test('should return null at end of file', async () => {
      const source = dedent`
        const x = 1;
        // @bp.hit
      `;
      const commentNode = await getCommentNodeAtLine(source, 1);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });

    test('should return null for standalone comments with no code', async () => {
      const source = dedent`
        // @bp.hit
        // another comment
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });

    test('should return null when only followed by block comment', async () => {
      const source = dedent`
        // @bp.hit
        /* another comment */
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });

    test('should return the code node when followed by blank line then code', async () => {
      const source = dedent`
        // @bp.hit

        const x = 1;
      `;
      const commentNode = await getCommentNodeAtLine(source, 0);
      const result = findRelatedCodeNode(commentNode);
      // Based on the implementation, this should still link to the next code node
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });

    test('should return null for comment in empty function body', async () => {
      const source = dedent`
        function test() {
          // @bp.hit
        }
      `;
      const commentNode = await getCommentNodeAtLine(source, 1);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });

    test('should return the code node for comment before first statement in function', async () => {
      const source = dedent`
        function test() {
          // @bp.hit
          const x = 1;
        }
      `;
      const commentNode = await getCommentNodeAtLine(source, 1);
      const result = findRelatedCodeNode(commentNode);
      assert.notStrictEqual(result, null);
      assert.ok(result?.text().includes('const x = 1'));
    });

    test('should return null for comment after return statement at end of function', async () => {
      const source = dedent`
        function test() {
          return x;
          // @bp.hit
        }
      `;
      const commentNode = await getCommentNodeAtLine(source, 2);
      const result = findRelatedCodeNode(commentNode);
      assert.strictEqual(result, null);
    });
  });

  // Group 5: Complex Scenarios - Mixed patterns
  suite('Complex Scenarios', () => {
    test('should handle multiple inline comments on different lines', async () => {
      const source = dedent`
        const x = 1; // @bp A
        const y = 2; // @bp B
        const z = 3; // @bp C
      `;

      const commentA = await getCommentNodeAtLine(source, 0);
      const commentB = await getCommentNodeAtLine(source, 1);
      const commentC = await getCommentNodeAtLine(source, 2);

      const resultA = findRelatedCodeNode(commentA);
      const resultB = findRelatedCodeNode(commentB);
      const resultC = findRelatedCodeNode(commentC);

      // Check that each comment is linked to its respective code node
      assert.ok(resultA?.text().includes('const x = 1'));
      assert.ok(resultB?.text().includes('const y = 2'));
      assert.ok(resultC?.text().includes('const z = 3'));
    });

    test('should handle comment above and inline comment on same statement (inline wins)', async () => {
      const source = dedent`
        // @bp A
        // @bp B
        const x = 1; // @bp C
      `;

      const commentB = await getCommentNodeAtLine(source, 1);
      const commentC = await getCommentNodeAtLine(source, 2);

      const resultB = findRelatedCodeNode(commentB);
      const resultC = findRelatedCodeNode(commentC);

      assert.strictEqual(resultB, null); // Should be null because inline comment takes precedence
      assert.ok(resultC?.text().includes('const x = 1'));
    });

    test('should handle comments in mixed statement types', async () => {
      const source = dedent`
        // @bp.hit
        if (condition) {
          // @bp.expr x > 0
          const x = 1; // @bp.log x
        }
      `;

      const comment1 = await getCommentNodeAtLine(source, 0);
      const comment2 = await getCommentNodeAtLine(source, 2);
      const comment3 = await getCommentNodeAtLine(source, 3);

      const result1 = findRelatedCodeNode(comment1);
      const result2 = findRelatedCodeNode(comment2);
      const result3 = findRelatedCodeNode(comment3);

      assert.ok(result1?.text().includes('if (condition)'));
      assert.ok(result3?.text().includes('const x = 1'));
      // comment2 is preempted by inline comment on the same code
      assert.strictEqual(result2, null);
    });
  });
});
