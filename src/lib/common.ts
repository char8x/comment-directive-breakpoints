import * as valibot from 'valibot';
import { BreakpointSuffixSchema } from '../typings.js';
import type { BreakpointSuffix, BreakpointMatchGroups } from '../typings.js';
import { CommentTree, CommentNode } from './commentTree.js';

// Regular expressions use loose matching
// Use negative lookahead (?![\w-]) to reject @bp followed by word chars or hyphen (e.g., @bp-hit, @bp_log)
// Matches both // (JS/TS/Go/Java/Rust/C) and # (Python/Ruby) comment prefixes
export const BREAKPOINT_COMMENT_LOOSE_REGEX =
  /(?:\/{2,}|#+)\s*@bp(?![\w-])(?:\.(?<type>\w+(?:\.disable)?))?\s*(?<expression>.*)/d;

/**
 * Get the expression state from a breakpoint comment.
 *
 * @param text The comment text
 * @returns Object with type and expression start offset, or null
 */
export function parseBreakpointComment(text: string | undefined): {
  type: BreakpointSuffix;
  expression: string;
  expressionStartOffset: number;
  typeEndOffset: number;
} | null {
  if (!text) {
    return null;
  }
  const match = BREAKPOINT_COMMENT_LOOSE_REGEX.exec(text);
  if (match && match.indices && match.groups) {
    // Reject false positives where @bp is inside an embedded comment prefix.
    // e.g., `// Line with "// @bp C"` — the regex matches the second `//` at
    // index 14, but the first `//` at index 0 shows this is descriptive text.
    // Allow overlap for `///` (triple slash): first `//` at 0, match at 1.
    const firstSlashSlash = text.indexOf('//');
    const firstHash = text.indexOf('#');
    const firstCommentPrefix =
      firstSlashSlash === -1 && firstHash === -1
        ? match.index
        : Math.min(
            firstSlashSlash === -1 ? Infinity : firstSlashSlash,
            firstHash === -1 ? Infinity : firstHash
          );
    // For `//`, allow up to 1 char of overlap (handles `///` where indexOf
    // returns 0 but regex matches at 1). For `#`, exact match is required.
    const maxOverlap = firstCommentPrefix === firstSlashSlash ? 1 : 0;
    if (match.index - firstCommentPrefix > maxOverlap) {
      return null;
    }
    const { type, expression } = match.groups as BreakpointMatchGroups;
    // Validate type if present
    if (type && valibot.safeParse(BreakpointSuffixSchema, type).success === false) {
      return null;
    }

    // Reject malformed suffix: dot immediately after @bp but no valid type captured
    // e.g., "// @bp. expression", "// @bp..hit 5", "// @bp. "
    if (!type) {
      const bpEnd = text.indexOf('@bp', match.index) + 3;
      if (bpEnd < text.length && text[bpEnd] === '.') {
        return null;
      }
    }

    // Reject extra dot-suffixed parts after a valid type
    // e.g., "// @bp.hit.log 10", "// @bp.disable.hit 10", "// @bp.hit..disable 10",
    //        "// @bp.hit.disable.extra 10", "// @bp.hit.disable.disable"
    if (type && (expression || '').startsWith('.')) {
      return null;
    }

    const trimmedExpression = (expression || '').trim();
    // Mandatory expression check for hit, log, expr (including .disable variants)
    if (type) {
      const baseType = type.split('.')[0];
      if (['hit', 'log', 'expr'].includes(baseType) && !trimmedExpression) {
        return null;
      }
    }

    const groups = match.indices.groups as {
      [key: string]: [number, number];
    };
    return {
      type: type ?? 'enable',
      expression: expression || '',
      expressionStartOffset: groups.expression[0],
      typeEndOffset: groups.type ? groups.type[1] : -1,
    };
  }
  return null;
}

// Map language IDs to their supported file extensions
export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  javascript: ['js', 'mjs', 'cjs'],
  typescript: ['ts', 'mts', 'cts'],
  javascriptreact: ['jsx'],
  typescriptreact: ['tsx'],
  python: ['py'],
  go: ['go'],
  ruby: ['rb'],
  java: ['java'],
  rust: ['rs'],
  // Temporarily disable C#, PHP, C, C++ support until their tree-sitter parsers are fully spec-ed.
  // Reference: src/lib/parse.ts isSupportedLanguageId()
  // csharp: ['cs'],
  // php: ['php'],
  // cpp: ['cpp', 'cc', 'cxx', 'hpp'],
  // c: ['c', 'h'],
};

export function extToLanguageId(filePath: string): string {
  const extension = filePath.split('.').pop();
  if (!extension) {
    return '';
  }

  for (const [languageId, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return languageId;
    }
  }

  return '';
}

/**
 * Get the search globs for ripgrep based on supported languages.
 *
 * @param supportedLanguages Array of supported language IDs
 * @returns Array of glob patterns
 */
export function getSearchGlobs(
  supportedLanguages: string[] | undefined
): string[] {
  if (!supportedLanguages || supportedLanguages.length === 0) {
    return [];
  }
  const extensions = new Set<string>();
  for (const lang of supportedLanguages) {
    if (LANGUAGE_EXTENSIONS[lang]) {
      LANGUAGE_EXTENSIONS[lang].forEach((ext) => extensions.add(ext));
    }
  }
  if (extensions.size === 0) {
    return [];
  }
  return [`**/*.{${Array.from(extensions).join(',')}}`];
}

// Single-entry cache for AST comment nodes to avoid reparsing large files on every keystroke
// We store the CommentTree instance to properly manage its lifecycle and prevent memory leaks
let cachedCommentTree: {
  languageId: string;
  source: string;
  tree: CommentTree;
} | null = null;

/**
 * Find all matching comments in the source code for the given language ID.
 * Results are cached to avoid reparsing the same source repeatedly.
 *
 * @param languageId
 * @param source
 * @returns
 */
export async function findAllCommentNodes(
  languageId: string,
  source: string
): Promise<CommentNode[]> {
  // Return cached result if source and languageId haven't changed
  if (
    cachedCommentTree &&
    cachedCommentTree.languageId === languageId &&
    cachedCommentTree.source === source
  ) {
    return cachedCommentTree.tree.comments;
  }

  // Dispose of the old tree before creating a new one to prevent memory leaks
  if (cachedCommentTree) {
    cachedCommentTree.tree[Symbol.dispose]();
  }

  const tree = CommentTree.create(languageId, source);
  await tree.build();

  // Cache the tree instance
  cachedCommentTree = { languageId, source, tree };

  return tree.comments;
}

/**
 * Clear the comment nodes cache. Useful for testing or when documents are closed.
 */
export function clearCommentNodesCache() {
  if (cachedCommentTree) {
    cachedCommentTree.tree[Symbol.dispose]();
    cachedCommentTree = null;
  }
}

/**
 * Find the code node associated with a comment node.
 *
 * @param node The comment node
 * @returns The associated code node, or null if none found
 */
export function findRelatedCodeNode(
  commentNode: CommentNode
): CommentNode | null {
  // Ignore block comments
  if (
    commentNode.text().startsWith('/*') &&
    commentNode.text().endsWith('*/')
  ) {
    return null;
  }

  const prev = commentNode.prev();
  const next = commentNode.next();

  /*
    Priority 1: Inline comments (same line as code)
    const a = 1; // @bp
  */
  if (
    prev &&
    prev.isNamed() &&
    !prev.kind().includes('comment') &&
    prev.range().start.line === commentNode.range().start.line
  ) {
    return prev;
  }

  /*
    Priority 2: Line comments above code
    case: 1
    // @bp A
    // @bp B
    // @bp C <-- n is here, keep this one
    const a = 1;

    case: 2
    // @bp A
    // @bp B
    // @bp C <-- node is here
    const a = 1; // @bp <-- keep this one (handled by Priority 1 above)
  */
  // find the last line comment
  // When line comments and inline comments coexist, keep the inline comment
  if (next && next.isNamed() && !next.kind().toString().includes('comment')) {
    if (
      next.next() &&
      next.next()?.kind().toString().includes('comment') &&
      parseBreakpointComment(next.next()?.text()) &&
      next.range().start.line === next.next()?.range().start.line
    ) {
      return null;
    }
    return next;
  }

  return null;
}

/**
 * Find the comment node for the position if it's within a comment.
 * Returns the associated comment node if the position is in a comment, otherwise null.
 *
 * @param languageId
 * @param source
 * @param line 0-indexed line number
 * @param character 0-indexed character position
 * @returns The comment node if in a comment, otherwise null
 */
export async function findCommentNodeAtPosition(
  languageId: string,
  source: string,
  line: number,
  character: number
): Promise<CommentNode | null> {
  const commentNodes = await findAllCommentNodes(languageId, source);

  for (const node of commentNodes) {
    const range = node.range();
    if (line < range.start.line || line > range.end.line) {
      continue;
    }

    if (line === range.start.line && character < range.start.column) {
      continue;
    }

    if (line === range.end.line && character > range.end.column) {
      continue;
    }

    // Position is inside this comment node, find the related code node
    return node;
  }

  return null;
}
