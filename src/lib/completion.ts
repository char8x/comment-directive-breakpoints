import type { ISchema } from './schema.js';

export interface CompletionCandidate {
  schema: ISchema;
  matchStart: number;
  matchLength: number;
}

/**
 * Calculate which completion candidates should be offered given a line of text
 * and cursor position.
 *
 * @param lineContent The full text of the current line
 * @param characterPos The character position (0-indexed) of the cursor
 * @param schemas The list of schemas to match against
 * @returns Array of matching completion candidates
 */
export function calculateCompletions(
  lineContent: string,
  characterPos: number,
  schemas: ISchema[]
): CompletionCandidate[] {
  const completes: CompletionCandidate[] = [];
  const prefix = lineContent.slice(0, characterPos);

  for (const schema of schemas) {
    // Case 1: Start of line (position = 1, like a single character typed)
    if (characterPos === 1) {
      completes.push({
        schema,
        matchStart: 0,
        matchLength: 0,
      });
      continue;
    }

    // Case 2: The whole line matches the pattern from the start
    if (new RegExp('^' + schema.style.source).test(lineContent)) {
      completes.push({
        schema,
        matchStart: 0,
        matchLength: characterPos,
      });
      continue;
    }

    // Case 3: The prefix matches the schema style
    const validMatcher = prefix.match(schema.style);
    if (validMatcher) {
      if (validMatcher[0].length >= 2) {
        completes.push({
          schema,
          matchStart: characterPos - validMatcher[0].length,
          matchLength: validMatcher[0].length,
        });
        continue;
      }
    }

    // Case 4: Match with whitespace prefix (e.g., indented line or after code)
    const validRegWithSpace = new RegExp('\\s' + schema.style.source);
    if (validRegWithSpace.test(prefix)) {
      completes.push({
        schema,
        matchStart: prefix.search(validRegWithSpace),
        matchLength: characterPos,
      });
      continue;
    }
  }

  return completes;
}
