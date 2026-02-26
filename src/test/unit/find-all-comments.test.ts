import { suite, test } from 'vitest';
import * as assert from 'node:assert';
import dedent from 'dedent';
import { findAllCommentNodes } from '../../lib/common.js';

suite('findAllComments', () => {
  suite('Language Support', () => {
    test('should find comments in JavaScript (single-line and block)', async () => {
      const source = dedent`
        // single line comment
        const x = 1; // inline comment
        /* block comment */
        const y = /* inline block */ 2;
      `;
      const comments = await findAllCommentNodes('javascript', source);
      assert.strictEqual(comments.length, 4);
    });

    test('should find comments in TypeScript (single-line and block)', async () => {
      const source = dedent`
        // TypeScript comment
        type MyType = string; // inline comment
        /* block comment */
        interface MyInterface { /* inline */ }
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 4);
    });

    test('should find comments in JavaScriptReact', async () => {
      const source = dedent`
        // JSX comment
        const Component = () => {
          // inside component
          return <div></div>;
        };
      `;
      const comments = await findAllCommentNodes('javascriptreact', source);
      assert.strictEqual(comments.length, 2);
    });

    test('should find comments in TypeScriptReact', async () => {
      const source = dedent`
        // TSX comment
        const Component: React.FC = () => {
          // inside component
          return <div></div>;
        };
      `;
      const comments = await findAllCommentNodes('typescriptreact', source);
      assert.strictEqual(comments.length, 2);
    });
  });

  // Comment Varieties - using TypeScript as primary test language
  suite('Comment Varieties', () => {
    test('should find multiple single-line comments', async () => {
      const source = dedent`
        // comment 1
        // comment 2
        // comment 3
        const x = 1;
        // comment 4
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 4);
    });

    test('should find multiple block comments', async () => {
      const source = dedent`
        /* comment 1 */
        /* comment 2 */
        const x = /* comment 3 */ 1;
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 3);
    });

    test('should find mixed single-line and block comments', async () => {
      const source = dedent`
        // single line
        /* block comment */
        const x = 1; // inline single
        const y = /* inline block */ 2;
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 4);
    });

    test('should find comments containing @bp directives', async () => {
      const source = dedent`
        // @bp
        // @bp.hit 10
        /* @bp.log value */
        const x = 1; // @bp.expr x > 0
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 4);
    });

    test('should find comments with leading/trailing whitespace', async () => {
      const source = dedent`
        //    comment with spaces
        // indented comment
        /*   block with spaces   */
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 3);
    });

    test('should find comments on the same line as code', async () => {
      const source = dedent`
        const x = 1; // comment 1
        const y = 2; /* comment 2 */ const z = 3;
        return x; // comment 3
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 3);
    });

    test('should find multi-line block comments', async () => {
      const source = dedent`
        /*
         * Multi-line
         * block comment
         */
        const x = 1;
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 1);
    });

    test('should find nested comments in code blocks', async () => {
      const source = dedent`
        function test() {
          // outer comment
          if (true) {
            // nested comment 1
            const x = 1; // nested comment 2
          }
          // outer comment 2
        }
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 4);
    });
  });

  // Edge Cases
  suite('Edge Cases', () => {
    test('should return empty array for empty source', async () => {
      const comments = await findAllCommentNodes('typescript', '');
      assert.strictEqual(comments.length, 0);
    });

    test('should return empty array for source with no comments', async () => {
      const source = dedent`
        const x = 1;
        const y = 2;
        function test() {
          return x + y;
        }
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 0);
    });

    test('should return empty array for source with only whitespace', async () => {
      const source = '   \n  \n\t\n  ';
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 0);
    });

    test('should handle source with only comments', async () => {
      const source = dedent`
        // comment 1
        // comment 2
        /* comment 3 */
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 3);
    });

    test('should handle comments with special characters', async () => {
      const source = dedent`
        // Comment with special chars: @#$%^&*()
        /* Comment with brackets []{} and quotes "'" */
        // Comment with backslashes \\\\ and slashes ///
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 3);
    });

    test('should handle comments in strings (should not find them)', async () => {
      const source = dedent`
        const str = "// this is not a comment";
        const str2 = '/* not a comment */';
        // this IS a comment
      `;
      const comments = await findAllCommentNodes('typescript', source);
      // Only the actual comment should be found, not the ones in strings
      assert.strictEqual(comments.length, 1);
    });

    test('should handle very long source files', async () => {
      const lines = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`const x${i} = ${i}; // comment ${i}`);
      }
      const source = lines.join('\n');
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 1000);
    });
  });

  // Verify that comments can be accessed and have content
  suite('Comment Node Properties', () => {
    test('should return comment nodes with accessible text', async () => {
      const source = dedent`
        // test comment
        const x = 1;
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 1);
      const comment = comments[0];
      assert.ok(comment);
      assert.ok(comment.text());
      assert.ok(comment.text().includes('test comment'));
    });

    test('should return comment nodes with position information', async () => {
      const source = dedent`
        // test comment
        const x = 1;
      `;
      const comments = await findAllCommentNodes('typescript', source);
      assert.strictEqual(comments.length, 1);
      const comment = comments[0];
      const range = comment.range();
      assert.ok(range);
      assert.strictEqual(range.start.line, 0);
    });
  });
});
