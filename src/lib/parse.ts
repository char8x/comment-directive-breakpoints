/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Modifications Copyright (c) 2026 Charles Xu.
 * Licensed under the MIT License.
 *
 * Extracted from https://github.com/microsoft/vscode-copilot-chat/blob/f0d81972aacabd7b4b6ebd91b9861c246166285f/src/extension/completions-core/vscode-node/prompt/src/parse.ts
 */

import { Parser, Language, Tree } from 'web-tree-sitter';
import * as fs from 'node:fs/promises';
import path from 'node:path';

export class DirectiveBreakpointsParserLoadFailure extends Error {
  readonly code = 'DirectiveBreakpointsParserLoadFailure';
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

export async function readFile(filename: string): Promise<Uint8Array> {
  return await fs.readFile(locateFile(filename));
}

export function locateFile(filename: string): string {
  // construct a path that works both for the TypeScript source, which lives under `/src`, and for
  // the transpiled JavaScript, which lives under `/dist`
  return path.resolve(
    path.extname(__filename) === '.ts'
      ? path.join(locationInPath(path.dirname(__dirname), 'src'), '..', 'dist')
      : locationInPath(__dirname, 'dist'),
    filename
  );
}

function locationInPath(filePath: string, directoryName: string): string {
  let p = filePath;
  while (path.basename(p) !== directoryName) {
    if (path.dirname(p) === p) {
      return filePath;
    }
    p = path.dirname(p);
  }
  return p;
}

export enum WASMLanguage {
  Python = 'python',
  JavaScript = 'javascript',
  TypeScript = 'typescript',
  TSX = 'tsx',
  Go = 'go',
  Ruby = 'ruby',
  CSharp = 'c-sharp',
  Java = 'java',
  Php = 'php',
  Cpp = 'cpp',
  Rust = 'rust',
}

const languageIdToWasmLanguageMapping: { [language: string]: WASMLanguage } = {
  python: WASMLanguage.Python,
  javascript: WASMLanguage.JavaScript,
  javascriptreact: WASMLanguage.JavaScript,
  jsx: WASMLanguage.JavaScript,
  typescript: WASMLanguage.TypeScript,
  typescriptreact: WASMLanguage.TSX,
  go: WASMLanguage.Go,
  ruby: WASMLanguage.Ruby,
  csharp: WASMLanguage.CSharp,
  java: WASMLanguage.Java,
  php: WASMLanguage.Php,
  c: WASMLanguage.Cpp,
  cpp: WASMLanguage.Cpp,
  rust: WASMLanguage.Rust,
};

export function isSupportedLanguageId(languageId: string): boolean {
  // Temporarily disable C# support until the tree-sitter parser for it is
  // fully spec-ed.
  return (
    languageId in languageIdToWasmLanguageMapping &&
    languageId !== 'csharp' &&
    languageId !== 'php' &&
    languageId !== 'c' &&
    languageId !== 'cpp'
  );
}

export function languageIdToWasmLanguage(languageId: string): WASMLanguage {
  if (!(languageId in languageIdToWasmLanguageMapping)) {
    throw new Error(`Unrecognized language: ${languageId}`);
  }
  return languageIdToWasmLanguageMapping[languageId];
}

const languageLoadPromises = new Map<WASMLanguage, Promise<Language>>();

async function loadWasmLanguage(language: WASMLanguage): Promise<Language> {
  // construct a path that works both for the TypeScript source, which lives under `/src`, and for
  // the transpiled JavaScript, which lives under `/dist`
  let wasmBytes;
  try {
    wasmBytes = await readFile(`tree-sitter-${language}.wasm`);
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      'code' in e &&
      typeof e.code === 'string' &&
      e.name === 'Error'
    ) {
      throw new DirectiveBreakpointsParserLoadFailure(
        `Could not load tree-sitter-${language}.wasm`,
        e
      );
    }
    throw e;
  }
  return Language.load(wasmBytes);
}

export function getLanguage(language: string): Promise<Language> {
  const wasmLanguage = languageIdToWasmLanguage(language);

  if (!languageLoadPromises.has(wasmLanguage)) {
    // IMPORTANT: This function does not have an async signature to prevent interleaved execution
    // that can cause duplicate loading of the same language during yields/awaits prior to them
    // being added to the cache.
    const loadedLang = loadWasmLanguage(wasmLanguage);
    languageLoadPromises.set(wasmLanguage, loadedLang);
  }

  return languageLoadPromises.get(wasmLanguage)!;
}

class WrappedError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
  }
}

// Cache the Parser.init() promise to ensure WASM is only initialized once
let parserInitPromise: Promise<void> | null = null;

async function ensureParserInit(): Promise<void> {
  if (!parserInitPromise) {
    parserInitPromise = Parser.init({
      locateFile: (filename: string) => locateFile(filename),
    });
  }
  return parserInitPromise;
}

// This method returns a tree that the user needs to call `.delete()` before going out of scope.
export async function parseTreeSitter(
  language: string,
  source: string
): Promise<Tree> {
  return (await parseTreeSitterIncludingVersion(language, source))[0];
}

// This method returns a tree that the user needs to call `.delete()` before going out of scope.
export async function parseTreeSitterIncludingVersion(
  language: string,
  source: string
): Promise<[Tree, number]> {
  // Ensure Parser WASM is initialized (only happens once)
  await ensureParserInit();
  let parser;
  try {
    parser = new Parser();
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'message' in e &&
      typeof e.message === 'string' &&
      e.message.includes('table index is out of bounds')
    ) {
      throw new WrappedError(
        `Could not init Parse for language <${language}>`,
        e
      );
    }
    throw e;
  }
  const treeSitterLanguage = await getLanguage(language);
  parser.setLanguage(treeSitterLanguage);
  const parsedTree = parser.parse(source);

  // Need to delete parser objects directly
  parser.delete();
  // @ts-ignore
  return [parsedTree, treeSitterLanguage.version];
}
