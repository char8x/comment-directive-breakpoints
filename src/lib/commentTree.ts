/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Modifications Copyright (c) 2026 Charles Xu.
 * Licensed under the MIT License.
 *
 * Extracted from https://github.com/microsoft/vscode-copilot-chat/blob/f0d81972aacabd7b4b6ebd91b9861c246166285f/src/extension/completions-core/vscode-node/lib/src/ghostText/statementTree.ts
 */

import { Node as TreeSitterNode, Tree, Language, Query } from 'web-tree-sitter';
import { parseTreeSitter } from './parse.js';

export class CommentNode {
  constructor(readonly node: TreeSitterNode) {}

  next(): CommentNode | null {
    return this.node.nextNamedSibling
      ? new CommentNode(this.node.nextNamedSibling)
      : null;
  }

  prev(): CommentNode | null {
    return this.node.previousNamedSibling
      ? new CommentNode(this.node.previousNamedSibling)
      : null;
  }

  isNamed(): boolean {
    return this.node.isNamed;
  }

  text(): string {
    return this.node.text;
  }

  kind(): string {
    return this.node.type;
  }

  range(): {
    start: { line: number; column: number };
    end: { line: number; column: number };
  } {
    return {
      start: {
        line: this.node.startPosition.row,
        column: this.node.startPosition.column,
      },
      end: {
        line: this.node.endPosition.row,
        column: this.node.endPosition.column,
      },
    };
  }
}

/**
 * CommentTree is a tree of comments.
 */
export abstract class CommentTree implements Disposable {
  protected tree: Tree | undefined;
  readonly comments: CommentNode[] = [];

  static isSupported(languageId: string): boolean {
    return (
      JSCommentTree.languageIds.has(languageId) ||
      TSCommentTree.languageIds.has(languageId) ||
      PyCommentTree.languageIds.has(languageId) ||
      GoCommentTree.languageIds.has(languageId) ||
      RubyCommentTree.languageIds.has(languageId) ||
      JavaCommentTree.languageIds.has(languageId) ||
      RustCommentTree.languageIds.has(languageId)
      // Temporarily disable PHP, C#, C/C++ support until their tree-sitter parsers are fully spec-ed.
      // Reference: src/lib/parse.ts isSupportedLanguageId()
      // || PhpCommentTree.languageIds.has(languageId)
      // || CSharpCommentTree.languageIds.has(languageId)
      // || CCommentTree.languageIds.has(languageId)
    );
  }

  static create(languageId: string, text: string): CommentTree {
    if (JSCommentTree.languageIds.has(languageId)) {
      return new JSCommentTree(languageId, text);
    } else if (TSCommentTree.languageIds.has(languageId)) {
      return new TSCommentTree(languageId, text);
    } else if (PyCommentTree.languageIds.has(languageId)) {
      return new PyCommentTree(languageId, text);
    } else if (GoCommentTree.languageIds.has(languageId)) {
      return new GoCommentTree(languageId, text);
    } else if (JavaCommentTree.languageIds.has(languageId)) {
      return new JavaCommentTree(languageId, text);
    } else if (RubyCommentTree.languageIds.has(languageId)) {
      return new RubyCommentTree(languageId, text);
    } else if (RustCommentTree.languageIds.has(languageId)) {
      return new RustCommentTree(languageId, text);
    // Temporarily disable PHP, C#, C/C++ support until their tree-sitter parsers are fully spec-ed.
    // Reference: src/lib/parse.ts isSupportedLanguageId()
    // } else if (PhpCommentTree.languageIds.has(languageId)) {
    //   return new PhpCommentTree(languageId, text);
    // } else if (CSharpCommentTree.languageIds.has(languageId)) {
    //   return new CSharpCommentTree(languageId, text);
    // } else if (CCommentTree.languageIds.has(languageId)) {
    //   return new CCommentTree(languageId, text);
    } else {
      throw new Error(`Unsupported languageId: ${languageId}`);
    }
  }

  constructor(
    private readonly languageId: string,
    private readonly text: string
  ) {}

  [Symbol.dispose]() {
    if (this.tree) {
      this.tree.delete();
      this.tree = undefined;
    }
  }

  clear() {
    this.comments.length = 0;
  }

  async build(): Promise<void> {
    this.clear();
    const tree = await this.parse();
    const query = this.getCommentQuery(tree);
    query.captures(tree.rootNode).forEach((capture) => {
      const comment = this.createNode(capture.node);
      this.addComment(comment);
    });
  }

  protected createNode(node: TreeSitterNode): CommentNode {
    return new CommentNode(node);
  }

  protected addComment(comment: CommentNode) {
    this.comments.push(comment);
  }

  protected abstract getCommentQueryText(): string;

  protected async parse(): Promise<Tree> {
    if (!this.tree) {
      this.tree = await parseTreeSitter(this.languageId, this.text);
    }
    return this.tree;
  }

  protected getCommentQuery(tree: Tree): Query {
    return this.getQuery(tree.language, this.getCommentQueryText());
  }

  protected getQuery(language: Language, queryText: string): Query {
    // TODO: query objects can be cached and reused
    return new Query(language, queryText);
  }
}

/*
 * Javascript and Typescript implementation
 */
class JSCommentTree extends CommentTree {
  static readonly languageIds = new Set([
    'javascript',
    'javascriptreact',
    'jsx',
  ]);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-javascript/blob/58404d8cf191d69f2674a8fd507bd5776f46cb11/grammar.js#L28
    return `(comment) @comment`;
  }
}

class TSCommentTree extends CommentTree {
  static readonly languageIds = new Set(['typescript', 'typescriptreact']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-javascript/blob/58404d8cf191d69f2674a8fd507bd5776f46cb11/grammar.js#L28
    return `(comment) @comment`;
  }
}

/*
 * Python implementation
 */
class PyCommentTree extends CommentTree {
  static readonly languageIds = new Set(['python']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-python/blob/26855eabccb19c6abf499fbc5b8dc7cc9ab8bc64/grammar.js#L43
    return `(comment) @comment`;
  }
}

/*
 * Go implementation
 */
class GoCommentTree extends CommentTree {
  static readonly languageIds = new Set(['go']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-go/blob/2346a3ab1bb3857b48b29d779a1ef9799a248cd7/grammar.js#L71
    return `(comment) @comment`;
  }
}

/**
 * Php implementation
 * Temporarily disabled until the tree-sitter parser for it is fully spec-ed.
 * Reference: src/lib/parse.ts isSupportedLanguageId()
 */
/*
class PhpCommentTree extends CommentTree {
  static readonly languageIds = new Set(['php']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-php/blob/7d07b41ce2d442ca9a90ed85d0075eccc17ae315/common/define-grammar.js#L112
    return `(comment) @comment`;
  }
}
*/
/**
 * Ruby implementation
 */
class RubyCommentTree extends CommentTree {
  static readonly languageIds = new Set(['ruby']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-ruby/blob/ab6dca77a8184abc94af6e3e82538741b5078d63/grammar.js#L78
    return `(comment) @comment`;
  }
}

/*
 * Java implementation
 */
class JavaCommentTree extends CommentTree {
  // Grammar via: https://github.com/tree-sitter/tree-sitter-java/blob/master/src/grammar.json
  // Node types via: https://github.com/tree-sitter/tree-sitter-java/blob/master/src/node-types.json
  static readonly languageIds = new Set(['java']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-java/blob/e10607b45ff745f5f876bfa3e94fbcc6b44bdc11/grammar.js#L51
    // Only line comments need to be supported
    return `(line_comment) @comment`;
  }
}

/*
 * C# implementation
 * Temporarily disabled until the tree-sitter parser for it is fully spec-ed.
 * Reference: src/lib/parse.ts isSupportedLanguageId()
 */
/*
class CSharpCommentTree extends CommentTree {
  static readonly languageIds = new Set(['csharp']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-c-sharp/blob/f05a2ca99d329de2e6c32f26a21c6169b2bfcbb7/grammar.js#L119
    return '(comment) @comment';
  }
}
*/

/*
 * C, C++ implementation
 * Temporarily disabled until the tree-sitter parser for it is fully spec-ed.
 * Reference: src/lib/parse.ts isSupportedLanguageId()
 */
/*
class CCommentTree extends CommentTree {
  static readonly languageIds = new Set(['c', 'cpp']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-c/blob/ae19b676b13bdcc13b7665397e6d9b14975473dd/grammar.js#L60
    return `(comment) @comment`;
  }
}
*/

class RustCommentTree extends CommentTree {
  static readonly languageIds = new Set(['rust']);

  protected getCommentQueryText(): string {
    // From https://github.com/tree-sitter/tree-sitter-rust/blob/261b20226c04ef601adbdf185a800512a5f66291/grammar.js#L65
    // Only line comments need to be supported
    return `(line_comment) @comment`;
  }
}
