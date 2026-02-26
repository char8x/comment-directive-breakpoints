import {
  Uri,
  Position,
  Location,
  SourceBreakpoint,
  Range as VSCodeRange,
  CompletionItem,
  TextDocument,
  CompletionItemKind,
  workspace,
} from 'vscode';
import {
  parseBreakpointComment,
  findAllCommentNodes,
  findRelatedCodeNode,
} from './common.js';
import type { BreakpointSuffix } from '../typings.js';
import type { ISchema } from './schema.js';

/**
 * Convert directive comments to SourceBreakpoint instances
 *
 * @param uri
 * @param range
 * @param type
 * @param content
 * @returns
 */
function commentToBreakpoint(
  uri: Uri,
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  },
  type: BreakpointSuffix,
  content: string
): SourceBreakpoint {
  const start = new Position(range.start.line, range.start.column);
  const end = new Position(range.end.line, range.end.column);
  const vscodeRange = new VSCodeRange(start, end);

  const locationInstance = new Location(uri, vscodeRange);
  return new SourceBreakpoint(
    locationInstance,
    !type.includes('disable'),
    type?.startsWith('expr') ? content : undefined,
    type?.startsWith('hit') ? content : undefined,
    type?.startsWith('log') ? content : undefined
  );
}

export async function extractBreakpoints(
  uri: Uri,
  languageId: string
): Promise<SourceBreakpoint[]> {
  const breakpoints: SourceBreakpoint[] = [];

  try {
    const content = await workspace.fs.readFile(uri);
    const source = new TextDecoder().decode(content);

    const commentNodes = await findAllCommentNodes(languageId, source);
    for (const node of commentNodes) {
      const matchGroups = parseBreakpointComment(node.text());
      if (matchGroups) {
        const codeNode = findRelatedCodeNode(node);
        if (!codeNode) {
          continue;
        }
        const { type, expression } = matchGroups;
        breakpoints.push(
          commentToBreakpoint(uri, codeNode.range(), type, expression)
        );
      }
    }
  } catch (error) {
    console.error('Failed to extract breakpoints:', error);
    return breakpoints;
  }

  return breakpoints;
}

export class CommentCompletionItem extends CompletionItem {
  constructor(schema: ISchema, document: TextDocument, position: Position) {
    super(schema.label, CompletionItemKind.Snippet);
    const reg = /\$\{([^\}]+)\}/;

    this.detail = schema.detail;
    this.documentation = schema.document;

    const line = document.lineAt(position.line).text;
    const prefix = line.slice(0, position.character).match(schema.style);

    // the text insert start and end
    const start = position.translate(0, prefix ? -prefix[0].length : 0);
    const hasPlaceholder = reg.test(schema.text);
    // If there is already non-whitespace content after the cursor (e.g. ` > 2`),
    // treat it as the existing placeholder value: keep the range at the cursor
    // and strip the placeholder text from insertText so the trailing content
    // is preserved.
    const trailing = line.slice(position.character);
    const hasTrailingContent = trailing.trim().length > 0;

    if (hasPlaceholder && hasTrailingContent) {
      // Trailing content exists — strip placeholder, keep trailing content
      this.insertText = schema.text.replace(reg, '').trimEnd();
    } else {
      this.insertText = schema.text.replace(reg, '$1');
    }

    const end =
      hasPlaceholder && !hasTrailingContent
        ? position.translate(0, line.length - position.character)
        : position.translate(0, 0);

    this.range = new VSCodeRange(start, end);

    const matcher = schema.text.match(reg);

    if (matcher) {
      const content = matcher[1];
      const index = matcher.index || 0;

      const focusStart = start.translate(0, index);
      const focusEnd = focusStart.translate(0, +content.length);

      this.command = {
        title: 'focus',
        command: 'comment-directive-breakpoints.comment-autocomplete.focus',
        arguments: [{ start: focusStart, end: focusEnd }],
      };
    }
  }
}
