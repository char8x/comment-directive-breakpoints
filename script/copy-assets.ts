/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Modifications Copyright (c) 2026 Charles Xu.
 * Licensed under the MIT License.
 */

import * as path from 'node:path';
import { argv } from 'node:process';
import { treeSitterGrammars, copyStaticAssets } from './common.js';

const REPO_ROOT = path.join(__dirname, '..');

async function main(relativeOutDir = 'dist') {
  console.log(`Copying static assets to ${relativeOutDir}...`);
  // copy static assets to dist
  await copyStaticAssets(REPO_ROOT, [
    ...treeSitterGrammars.map(grammar => `node_modules/@vscode/tree-sitter-wasm/wasm/${grammar.name}.wasm`),
    // The version of `@vscode/tree-sitter-wasm` must be consistent with `web-tree-sitter`, and the wasm file for `web-tree-sitter` also needs to be copied
    'node_modules/web-tree-sitter/tree-sitter.wasm',
  ], relativeOutDir);

}

main(argv[2]);
