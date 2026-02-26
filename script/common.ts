import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ITreeSitterGrammar {
  name: string;
  /**
   * A custom .wasm filename if the grammar node module doesn't follow the standard naming convention
   */
  filename?: string;
  /**
   * The path where we should spawn `tree-sitter build-wasm`
   */
  projectPath?: string;
}

export const treeSitterGrammars: ITreeSitterGrammar[] = [
  {
    name: 'tree-sitter-go',
  },
  {
    name: 'tree-sitter-javascript', // Also includes jsx support
  },
  {
    name: 'tree-sitter-python',
  },
  {
    name: 'tree-sitter-ruby',
  },
  {
    name: 'tree-sitter-typescript',
    projectPath: 'tree-sitter-typescript/typescript', // non-standard path
  },
  {
    name: 'tree-sitter-tsx',
    projectPath: 'tree-sitter-typescript/tsx', // non-standard path
  },
  {
    name: 'tree-sitter-java',
  },
  {
    name: 'tree-sitter-rust',
  },
  // Temporarily disable PHP, C#, C/C++ support until their tree-sitter parsers are fully spec-ed.
  // Reference: src/lib/parse.ts isSupportedLanguageId()
  // {
  //   name: 'tree-sitter-php'
  // },
  // {
  //   name: 'tree-sitter-c-sharp',
  //   filename: 'tree-sitter-c_sharp.wasm' // non-standard filename
  // },
  // {
  //   name: 'tree-sitter-cpp',
  // },
];

export async function copyStaticAssets(repoRoot: string, srcpaths: string[], dst: string): Promise<void> {
  await Promise.all(srcpaths.map(async srcpath => {
    const src = path.join(repoRoot, srcpath);
    const dest = path.join(repoRoot, dst, path.basename(srcpath));
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(src, dest);
  }));
}
