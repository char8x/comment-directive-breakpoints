import { suite, test } from 'vitest';
import * as assert from 'node:assert';
import { parseBreakpointComment, BREAKPOINT_COMMENT_LOOSE_REGEX } from '../../lib/common.js';

suite('parseBreakpointComment', () => {
  suite('Invalid Input & Format (Negative Cases)', () => {
    test('should return null for undefined input', () => {
      const result = parseBreakpointComment(undefined);
      assert.strictEqual(result, null);
    });

    test('should return null for empty string', () => {
      const result = parseBreakpointComment('');
      assert.strictEqual(result, null);
    });

    test('should return null for whitespace-only string', () => {
      const result = parseBreakpointComment('   ');
      assert.strictEqual(result, null);
    });

    test('should return null for newline characters', () => {
      const result = parseBreakpointComment('\n\n');
      assert.strictEqual(result, null);
    });

    test('should return null for regular comment - missing @bp', () => {
      const result = parseBreakpointComment('// regular comment');
      assert.strictEqual(result, null);
    });

    test('should return null for non-comment code', () => {
      assert.strictEqual(parseBreakpointComment('const a = 1;'), null);
    });

    test('should return null for wrong prefix @breakpoint', () => {
      const result = parseBreakpointComment('// @breakpoint');
      assert.strictEqual(result, null);
    });

    test('should return null for partial bp prefix @b', () => {
      assert.strictEqual(parseBreakpointComment('// @b'), null);
    });

    test('should return null for no slashes before @bp', () => {
      const result = parseBreakpointComment('@bp.hit 10');
      assert.strictEqual(result, null);
    });

    test('should return null for block comment style', () => {
      const result = parseBreakpointComment('/* @bp.hit 10 */');
      assert.strictEqual(result, null);
    });

    test('should return null for multi-line block comment', () => {
      const result = parseBreakpointComment('/* @bp */');
      assert.strictEqual(result, null);
    });

    test('should return null for uppercase @BP', () => {
      const result = parseBreakpointComment('// @BP.hit 5');
      assert.strictEqual(result, null);
    });

    test('should return null for mixed case @Bp', () => {
      const result = parseBreakpointComment('// @Bp.log value');
      assert.strictEqual(result, null);
    });

    test('should return null for uppercase type suffix @bp.HIT', () => {
      const result = parseBreakpointComment('// @bp.HIT 10');
      assert.strictEqual(result, null);
    });

    test('should return null for invalid suffix @bp.invalid', () => {
      const result = parseBreakpointComment('// @bp.invalid expression');
      assert.strictEqual(result, null);
    });

    test('should return null for invalid suffix with expression', () => {
      assert.strictEqual(parseBreakpointComment('// @bp.invalid foo'), null);
    });

    test('should return null for unknown type @bp.xyz', () => {
      const result = parseBreakpointComment('// @bp.xyz 123');
      assert.strictEqual(result, null);
    });

    // Boundary case for type without space before expression
    test('should return null for type immediately followed by digit (no space)', () => {
      const result = parseBreakpointComment('// @bp.hit10');
      assert.strictEqual(result, null);
    });

    test('should return null for type immediately followed by letters (no space)', () => {
      const result = parseBreakpointComment('// @bp.logmessage');
      assert.strictEqual(result, null);
    });
  });

  suite('Default Type (enable)', () => {
    test('should parse basic @bp with no expression', () => {
      const result = parseBreakpointComment('// @bp');
      assert.strictEqual(result?.type, 'enable');
      assert.strictEqual(result?.expression, '');
      assert.strictEqual(result?.expressionStartOffset, 6);
      assert.strictEqual(result?.typeEndOffset, -1); // No explicit type
    });

    test('should parse @bp with expression (no explicit type)', () => {
      const result = parseBreakpointComment('// @bp someExpression');
      assert.strictEqual(result?.type, 'enable');
      assert.strictEqual(result?.expression, 'someExpression');
      assert.strictEqual(result?.expressionStartOffset, 7);
      assert.strictEqual(result?.typeEndOffset, -1);
    });

    test('should parse @bp with extra spaces before expression', () => {
      const result = parseBreakpointComment('// @bp  expr');
      assert.ok(result);
      assert.strictEqual(result?.type, 'enable');
      assert.strictEqual(result?.expressionStartOffset, 8);
      assert.strictEqual(result?.typeEndOffset, -1);
    });

    test('should parse explicit @bp.enable suffix', () => {
      const result = parseBreakpointComment('// @bp.enable');
      assert.ok(result);
      assert.strictEqual(result?.type, 'enable');
      assert.strictEqual(result?.expressionStartOffset, 13);
      assert.strictEqual(result?.typeEndOffset, 13);
    });
  });

  suite('Explicit Types (hit, log, expr)', () => {
    test('should parse @bp.hit directive', () => {
      const result = parseBreakpointComment('// @bp.hit 10');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '10');
      assert.strictEqual(result?.expressionStartOffset, 11);
      assert.strictEqual(result?.typeEndOffset, 10);
    });

    test('should parse @bp.log directive', () => {
      const result = parseBreakpointComment('// @bp.log myVariable');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'myVariable');
      assert.strictEqual(result?.expressionStartOffset, 11);
      assert.strictEqual(result?.typeEndOffset, 10);
    });

    test('should parse @bp.expr directive', () => {
      const result = parseBreakpointComment('// @bp.expr x > 5');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, 'x > 5');
      assert.strictEqual(result?.expressionStartOffset, 12);
      assert.strictEqual(result?.typeEndOffset, 11);
    });

    test('should parse @bp.disable directive', () => {
      const result = parseBreakpointComment('// @bp.disable');
      assert.strictEqual(result?.type, 'disable');
      assert.strictEqual(result?.expression, '');
      assert.strictEqual(result?.expressionStartOffset, 14);
      assert.strictEqual(result?.typeEndOffset, 14);
    });

    test('should return null for hit type without expression', () => {
      const result = parseBreakpointComment('// @bp.hit');
      assert.strictEqual(result, null);
    });

    test('should return null for expr type with trailing space only', () => {
      const result = parseBreakpointComment('// @bp.expr ');
      assert.strictEqual(result, null);
    });
  });

  suite('Combined/Status Directives (.disable modifiers)', () => {
    test('should parse @bp.hit.disable directive', () => {
      const result = parseBreakpointComment('// @bp.hit.disable 5');
      assert.strictEqual(result?.type, 'hit.disable');
      assert.strictEqual(result?.expression, '5');
      assert.strictEqual(result?.typeEndOffset, 18);
    });

    test('should parse @bp.log.disable directive', () => {
      const result = parseBreakpointComment('// @bp.log.disable message');
      assert.strictEqual(result?.type, 'log.disable');
      assert.strictEqual(result?.expression, 'message');
      assert.strictEqual(result?.typeEndOffset, 18);
    });

    test('should parse @bp.expr.disable directive', () => {
      const result = parseBreakpointComment('// @bp.expr.disable y < 10');
      assert.strictEqual(result?.type, 'expr.disable');
      assert.strictEqual(result?.expression, 'y < 10');
      assert.strictEqual(result?.typeEndOffset, 19);
    });

    test('should identify standalone disable', () => {
      const result = parseBreakpointComment('// @bp.disable');
      assert.ok(result);
      assert.strictEqual(result?.type, 'disable');
      assert.strictEqual(result?.expressionStartOffset, 14);
      assert.strictEqual(result?.typeEndOffset, 14);
    });

    test('should return null for log.disable without expression', () => {
      const result = parseBreakpointComment('// @bp.log.disable');
      assert.strictEqual(result, null);
    });

    test('should return null for hit.disable without expression', () => {
      const result = parseBreakpointComment('// @bp.hit.disable');
      assert.strictEqual(result, null);
    });

    test('should return null for expr.disable without expression', () => {
      const result = parseBreakpointComment('// @bp.expr.disable');
      assert.strictEqual(result, null);
    });
  });

  suite('Whitespace & Location Handling', () => {
    test('should handle multiple spaces after //', () => {
      const result = parseBreakpointComment('//    @bp.hit 100');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '100');
    });

    test('should handle no space after //', () => {
      const result = parseBreakpointComment('//@bp.log value');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'value');
      assert.strictEqual(result?.expressionStartOffset, 10);
    });

    test('should parse directive with leading whitespace', () => {
      const result = parseBreakpointComment('  // @bp.hit 5');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '5');
    });

    test('should parse directive with tabs and spaces', () => {
      const result = parseBreakpointComment('\t  // @bp.log value');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'value');
    });

    test('should parse directive appearing after code on same line', () => {
      const result = parseBreakpointComment('const a = 1; // @bp.expr a > 0');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, 'a > 0');
    });

    test('should parse directive with semicolon and whitespace before comment', () => {
      const result = parseBreakpointComment('return x;   // @bp.log x');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'x');
    });

    test('should handle multiple spaces after // (offset check)', () => {
      const result = parseBreakpointComment('//  @bp.log  x');
      assert.ok(result);
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expressionStartOffset, 13);
    });
  });

  suite('Expression Parsing', () => {
    test('should preserve extra spaces around expression', () => {
      const result = parseBreakpointComment('// @bp.expr    count === 5   ');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, 'count === 5   ');
    });

    test('should handle complex expression with special characters', () => {
      const result = parseBreakpointComment('// @bp.log obj.prop["key"].value()');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'obj.prop["key"].value()');
    });

    test('should handle expression with quoted string', () => {
      const result = parseBreakpointComment('// @bp.log "hello world"');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, '"hello world"');
    });

    test('should handle expression with mathematical operators', () => {
      const result = parseBreakpointComment('// @bp.expr (x + y) * z / 2');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, '(x + y) * z / 2');
    });
  });

  suite('Edge Cases & Robustness', () => {
    test('should return null for directive with dot at end but no type', () => {
      const result = parseBreakpointComment('// @bp. expression');
      assert.strictEqual(result, null);
    });

    test('should return null for malformed nested suffix', () => {
      const result = parseBreakpointComment('// @bp.hit.disable.disable');
      assert.strictEqual(result, null);
    });

    test('should return null for malformed nested suffix case 2', () => {
      const result = parseBreakpointComment('// @bp.hit.disable.disable 10');
      assert.strictEqual(result, null);
    });

    test('should return null for double dots in suffix', () => {
      const result = parseBreakpointComment('// @bp..hit 5');
      assert.strictEqual(result, null);
    });

    test('should parse triple slashes /// @bp', () => {
      const result = parseBreakpointComment('/// @bp.hit 10');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '10');
    });

    test('should parse only the first directive when multiple @bp directives exist', () => {
      const result = parseBreakpointComment('// @bp.hit 10 // @bp.log 5');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '10 // @bp.log 5');
    });

    test('should handle Unicode characters in expression', () => {
      const result = parseBreakpointComment('// @bp.log message + "🚀"');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'message + "🚀"');
    });

    test('should return null for @bp. with trailing space only', () => {
      const result = parseBreakpointComment('// @bp. ');
      assert.strictEqual(result, null);
    });

    test('should return null for suffix with extra unknown parts', () => {
      const result = parseBreakpointComment('// @bp.hit.disable.extra 10');
      assert.strictEqual(result, null);
    });

    test('should handle expression with embedded slashes (URL)', () => {
      const result = parseBreakpointComment('// @bp.log "http://example.com"');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, '"http://example.com"');
    });

    test('should return null for @bp.hit without expression', () => {
      const result = parseBreakpointComment('// @bp.hit');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.log without expression', () => {
      const result = parseBreakpointComment('// @bp.log');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.expr without expression', () => {
      const result = parseBreakpointComment('// @bp.expr');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.hit with only trailing space', () => {
      const result = parseBreakpointComment('// @bp.hit ');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.log with only trailing space', () => {
      const result = parseBreakpointComment('// @bp.log ');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.expr with only trailing space', () => {
      const result = parseBreakpointComment('// @bp.expr ');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.hit.disable without expression', () => {
      const result = parseBreakpointComment('// @bp.hit.disable');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.log.disable without expression', () => {
      const result = parseBreakpointComment('// @bp.log.disable');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.expr.disable without expression', () => {
      const result = parseBreakpointComment('// @bp.expr.disable');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.hit.disable with only whitespace', () => {
      const result = parseBreakpointComment('// @bp.hit.disable   ');
      assert.strictEqual(result, null);
    });

    test('should parse @bp.disable without expression as valid', () => {
      const result = parseBreakpointComment('// @bp.disable');
      assert.ok(result);
      assert.strictEqual(result?.type, 'disable');
      assert.strictEqual(result?.expression, '');
    });

    test('should parse @bp alone without expression as valid', () => {
      const result = parseBreakpointComment('// @bp');
      assert.ok(result);
      assert.strictEqual(result?.type, 'enable');
      assert.strictEqual(result?.expression, '');
    });

    test('should return null for invalid type @bp.hits (typo)', () => {
      const result = parseBreakpointComment('// @bp.hits 10');
      assert.strictEqual(result, null);
    });

    test('should return null for invalid type @bp.logging (typo)', () => {
      const result = parseBreakpointComment('// @bp.logging msg');
      assert.strictEqual(result, null);
    });

    test('should return null for malformed prefix with space between slashes', () => {
      const result = parseBreakpointComment('/ / @bp.hit 10');
      assert.strictEqual(result, null);
    });

    test('should return null for single slash prefix', () => {
      const result = parseBreakpointComment('/ @bp.hit 10');
      assert.strictEqual(result, null);
    });

    test('should parse directive with tab separator before expression', () => {
      const result = parseBreakpointComment('// @bp.expr\tfoo');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, 'foo');
    });

    test('should parse directive with tab and space mix before expression', () => {
      const result = parseBreakpointComment('// @bp.log\t bar');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'bar');
    });

    test('should return null for @bp.expr with only tab (no real expression)', () => {
      const result = parseBreakpointComment('// @bp.expr\t');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.hit with only tabs and spaces', () => {
      const result = parseBreakpointComment('// @bp.hit\t   \t');
      assert.strictEqual(result, null);
    });
  });

  suite('Error Guessing - Additional Edge Cases', () => {
    // False Positives: @bp not immediately following //
    test('should return null for @bp appearing after other text', () => {
      const result = parseBreakpointComment('// some text @bp.hit 10');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp embedded in quoted text within comment', () => {
      assert.strictEqual(parseBreakpointComment('// Line with "// @bp C"'), null);
    });

    test('should return null for @bp.hit embedded in quoted text within comment', () => {
      assert.strictEqual(parseBreakpointComment('// Line with "// @bp.hit 10"'), null);
    });

    test('should return null for @bp embedded in quoted text within hash comment', () => {
      assert.strictEqual(parseBreakpointComment('# see "# @bp" above'), null);
    });

    test('should return null for extended type name @bp.hitit', () => {
      const result = parseBreakpointComment('// @bp.hitit 10');
      assert.strictEqual(result, null);
    });

    // Expression starts with punctuation (no space before expression)
    test('should parse @bp.log with expression starting with parenthesis', () => {
      const result = parseBreakpointComment('// @bp.log(message)');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, '(message)');
    });

    test('should parse @bp.expr with expression starting with bracket', () => {
      const result = parseBreakpointComment('// @bp.expr[1, 2].includes(x)');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, '[1, 2].includes(x)');
    });

    test('should parse @bp.log with expression starting with curly brace', () => {
      const result = parseBreakpointComment('// @bp.log{key: value}');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, '{key: value}');
    });

    // Suffix/Type variants: invalid combinations
    test('should return null for @bp.hit.log', () => {
      const result = parseBreakpointComment('// @bp.hit.log 10');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.disable.hit', () => {
      const result = parseBreakpointComment('// @bp.disable.hit 10');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp.hit..disable', () => {
      const result = parseBreakpointComment('// @bp.hit..disable 10');
      assert.strictEqual(result, null);
    });

    // Multiple markers in comment: first wins
    test('should include second @bp marker in expression', () => {
      const result = parseBreakpointComment('// @bp.log first // @bp.log second');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'first // @bp.log second');
    });

    test('should include trailing comment in expression', () => {
      const result = parseBreakpointComment('// @bp.log msg // some comment');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'msg // some comment');
    });

    // Whitespace edge cases
    test('should parse directive with multiple tabs', () => {
      const result = parseBreakpointComment('//\t\t@bp.hit\t10');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '10');
    });

    test('should parse @bp with space before dot as enable with expression', () => {
      const result = parseBreakpointComment('// @bp .expression');
      assert.strictEqual(result?.type, 'enable');
      assert.strictEqual(result?.expression, '.expression');
    });

    // Malformed prefix
    test('should return null for space inside @bp prefix', () => {
      const result = parseBreakpointComment('// @ bp');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp with hyphen @bp-hit', () => {
      const result = parseBreakpointComment('// @bp-hit 10');
      assert.strictEqual(result, null);
    });

    test('should return null for @bp with underscore @bp_log', () => {
      const result = parseBreakpointComment('// @bp_log msg');
      assert.strictEqual(result, null);
    });

    // Expression with escape sequences
    test('should handle expression with escape sequences', () => {
      const result = parseBreakpointComment('// @bp.log "hello\\nworld"');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, '"hello\\nworld"');
    });

    // Expression with template literal syntax
    test('should handle expression with template literal', () => {
      const result = parseBreakpointComment('// @bp.log `value: ${x}`');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, '`value: ${x}`');
    });

    // Very long expression
    test('should handle very long expression', () => {
      const longExpr = 'a'.repeat(1000);
      const result = parseBreakpointComment(`// @bp.log ${longExpr}`);
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, longExpr);
    });

    // Expression with only special characters
    test('should handle expression with only special characters', () => {
      const result = parseBreakpointComment('// @bp.log !@#$%^&*');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, '!@#$%^&*');
    });

    // Carriage return in input
    test('should ignore carriage return', () => {
      const result = parseBreakpointComment('// @bp.log msg\r');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'msg');
    });
  });

  suite('Hash-Style Comments (#)', () => {
    test('should parse basic # @bp', () => {
      const result = parseBreakpointComment('# @bp');
      assert.strictEqual(result?.type, 'enable');
      assert.strictEqual(result?.expression, '');
    });

    test('should parse # @bp.hit directive', () => {
      const result = parseBreakpointComment('# @bp.hit 10');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '10');
    });

    test('should parse # @bp.log directive', () => {
      const result = parseBreakpointComment('# @bp.log myVariable');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'myVariable');
    });

    test('should parse # @bp.expr directive', () => {
      const result = parseBreakpointComment('# @bp.expr x > 5');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, 'x > 5');
    });

    test('should parse # @bp.disable directive', () => {
      const result = parseBreakpointComment('# @bp.disable');
      assert.strictEqual(result?.type, 'disable');
      assert.strictEqual(result?.expression, '');
    });

    test('should parse # @bp.hit.disable combined type', () => {
      const result = parseBreakpointComment('# @bp.hit.disable 5');
      assert.strictEqual(result?.type, 'hit.disable');
      assert.strictEqual(result?.expression, '5');
    });

    test('should parse # @bp.log.disable combined type', () => {
      const result = parseBreakpointComment('# @bp.log.disable message');
      assert.strictEqual(result?.type, 'log.disable');
      assert.strictEqual(result?.expression, 'message');
    });

    test('should handle no space after # (#@bp)', () => {
      const result = parseBreakpointComment('#@bp.log value');
      assert.strictEqual(result?.type, 'log');
      assert.strictEqual(result?.expression, 'value');
    });

    test('should handle multiple spaces after #', () => {
      const result = parseBreakpointComment('#   @bp.hit 100');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '100');
    });

    test('should parse inline # comment after code', () => {
      const result = parseBreakpointComment('x = 1  # @bp.expr x > 0');
      assert.strictEqual(result?.type, 'expr');
      assert.strictEqual(result?.expression, 'x > 0');
    });

    test('should parse # @bp with leading whitespace', () => {
      const result = parseBreakpointComment('    # @bp.hit 5');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '5');
    });

    test('should return null for # regular comment without @bp', () => {
      const result = parseBreakpointComment('# regular comment');
      assert.strictEqual(result, null);
    });

    test('should return null for # @BP uppercase', () => {
      const result = parseBreakpointComment('# @BP.hit 5');
      assert.strictEqual(result, null);
    });

    test('should return null for # @bp.hit without expression', () => {
      const result = parseBreakpointComment('# @bp.hit');
      assert.strictEqual(result, null);
    });

    test('should return null for # @bp-hit (hyphenated)', () => {
      const result = parseBreakpointComment('# @bp-hit 10');
      assert.strictEqual(result, null);
    });

    test('should return null for # @bp_log (underscored)', () => {
      const result = parseBreakpointComment('# @bp_log msg');
      assert.strictEqual(result, null);
    });

    test('should parse triple sharp ### @bp', () => {
      const result = parseBreakpointComment('### @bp.hit 10');
      assert.strictEqual(result?.type, 'hit');
      assert.strictEqual(result?.expression, '10');
    });
  });

  suite('BREAKPOINT_COMMENT_LOOSE_REGEX ripgrep compatibility', () => {
    function testMatch(input: string) {
      return new RegExp(BREAKPOINT_COMMENT_LOOSE_REGEX.source, 'd').exec(input);
    }

    test('should match // @bp style comments', () => {
      assert.ok(testMatch('// @bp'));
      assert.ok(testMatch('// @bp.hit 10'));
      assert.ok(testMatch('// @bp.log msg'));
    });

    test('should match # @bp style comments', () => {
      assert.ok(testMatch('# @bp'));
      assert.ok(testMatch('# @bp.hit 10'));
      assert.ok(testMatch('# @bp.log msg'));
    });

    test('should match inline // and # comments after code', () => {
      assert.ok(testMatch('const x = 1; // @bp'));
      assert.ok(testMatch('x = 1  # @bp.expr x > 0'));
    });

    test('should not match /* block comment */ or bare @bp', () => {
      assert.strictEqual(testMatch('/* @bp */'), null);
      assert.strictEqual(testMatch('@bp.hit 10'), null);
    });
  });
});
