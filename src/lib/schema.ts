import { MarkdownString, DocumentSelector } from 'vscode';

type matcher = RegExp;

export interface ISchema {
  name: string;
  label: string;
  text: string;
  detail?: string;
  document?: MarkdownString | string;
  style: matcher;
}

const commentStyle: { [k: string]: matcher } = {
  slash: /\/{1,}\s*$/,
  star: /\/\**\s*$/,
  arrowDash: /<!-*\s*$/,
  hash: /#{1,}\s*$/,
  hashBracket: /#\[\s*$/,
  hashArrow: /<#\s*$/,
  dashdash: /--{1,}\s*$/,
  dash: /-{1,}\s*$/,
  quote: /'\s*$/,
  percent: /\%\s*$/,
  semicolon: /\;\s*$/,
};

export enum Language {
  // the language support /* */ and // style
  js = 'javascript',
  jsx = 'javascriptreact',
  ts = 'typescript',
  tsx = 'typescriptreact',
  golang = 'go',
  dart = 'dart',
  al = 'al',
  // Temporarily disable C, C++, C# support until their tree-sitter parsers are fully spec-ed.
  // Reference: src/lib/parse.ts isSupportedLanguageId()
  // c = 'c',
  // cpp = 'cpp',
  // csharp = 'csharp',
  flax = 'flax',
  fsharp = 'fsharp',
  haxe = 'haxe',
  java = 'java',
  jsonc = 'jsonc',
  less = 'less',
  pascal = 'pascal',
  objectpascal = 'objectpascal',
  // Temporarily disable PHP support until its tree-sitter parser is fully spec-ed.
  // Reference: src/lib/parse.ts isSupportedLanguageId()
  // php = 'php',
  rust = 'rust',
  scala = 'scala',
  swift = 'swift',
  verilog = 'verilog',
  // the language only support // style
  asciidoc = 'asciidoc',
  // the language only support /* */ style
  css = 'css',
  scss = 'scss',
  sass = 'sass',
  stylus = 'stylus',
  vue = 'vue',
  // the language only support <!-- --> style
  html = 'html',
  xml = 'xml',
  markdown = 'markdown',
  // the language only support # style
  yaml = 'yaml',
  shellscript = 'shellscript',
  makefile = 'makefile',
  coffeescript = 'coffeescript',
  dockerfile = 'dockerfile',
  gdscript = 'gdscript',
  graphql = 'graphql',
  julia = 'julia',
  perl = 'perl',
  perl6 = 'perl6',
  puppet = 'puppet',
  r = 'r',
  ruby = 'ruby',
  tcl = 'tcl',
  elixir = 'elixir',
  python = 'python',
  dotenv = 'dotenv',
  gitignore = 'gitignore',
  terraform = 'terraform',
  // support #[ ]# style
  nim = 'nim',
  // support <# #> style
  powershell = 'powershell',
  // support -- styles
  ada = 'ada',
  hivesql = 'hive-sql',
  lua = 'lua',
  pig = 'pig',
  plsql = 'plsql',
  sql = 'sql',
  // - style
  haskell = 'haskell',
  // ' style
  vb = 'vb',
  diagram = 'diagram',
  // % style
  bibtex = 'bibtex',
  erlang = 'erlang',
  latex = 'latex',
  matlab = 'matlab',
  // ; style
  clojure = 'clojure',
  racket = 'racket',
  lisp = 'lisp',
}

enum Style {
  slash,
  star,
  arrowDash,
  hash,
  hashBracket,
  hashArrow,
  dashdash,
  dash,
  quote,
  percent,
  semicolon,
}

const commonStyles = [
  Style.slash,
  Style.star,
  Style.arrowDash,
  Style.hash,
  Style.hashBracket,
  Style.hashArrow,
  Style.dashdash,
  Style.dash,
  Style.quote,
  Style.percent,
  Style.semicolon,
];

// Matcher for partial @bp. prefix (e.g., "// @bp.")
const bpPartialStyle: { [k: string]: matcher } = {
  slashAt: /\/\/\s*@$/,
  slashAtB: /\/\/\s*@b$/,
  slashAtBp: /\/\/\s*@bp$/,
  slashBp: /\/\/\s*@bp\.\w*$/,
  slashBpHit: /\/\/\s*@bp\.hit\.\w*$/,
  slashBpLog: /\/\/\s*@bp\.log\.\w*$/,
  slashBpExpr: /\/\/\s*@bp\.expr\.\w*$/,
};

// Matcher for partial @bp. prefix with hash-style comments (e.g., "# @bp.")
const hashPartialStyle: { [k: string]: matcher } = {
  hashAt: /#\s*@$/,
  hashAtB: /#\s*@b$/,
  hashAtBp: /#\s*@bp$/,
  hashBp: /#\s*@bp\.\w*$/,
  hashBpHit: /#\s*@bp\.hit\.\w*$/,
  hashBpLog: /#\s*@bp\.log\.\w*$/,
  hashBpExpr: /#\s*@bp\.expr\.\w*$/,
};

// Helper to generate schema with custom style matcher
function generateWithStyle(
  name: string,
  styleMatcher: matcher,
  prefix: string,
  options: {
    text?: string;
    detail?: string;
    document?: string | MarkdownString;
  } = {}
): ISchema {
  return {
    name: name.split(' ')[0] || 'bp',
    label: prefix + name,
    detail: options.detail,
    document:
      typeof options.document === 'string'
        ? new MarkdownString(options.document)
        : options.document,
    text: prefix + (options.text || name),
    style: styleMatcher,
  };
}

const bp: ISchema[] = [
  // Base completions (triggered by // )
  ...generate('@bp', [Style.slash], {
    text: '@bp',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `// @bp`',
  }),
  ...generate('@bp.log', [Style.slash], {
    text: '@bp.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `// @bp.log {x} is {y}`',
  }),
  ...generate('@bp.hit', [Style.slash], {
    text: '@bp.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `// @bp.hit > 5`',
  }),
  ...generate('@bp.expr', [Style.slash], {
    text: '@bp.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `// @bp.expr x > 0`',
  }),

  // Completions triggered by "// @"
  generateWithStyle('bp', bpPartialStyle.slashAt, '// @', {
    text: 'bp',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `// @bp`',
  }),
  generateWithStyle('bp.hit', bpPartialStyle.slashAt, '// @', {
    text: 'bp.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `// @bp.hit > 5`',
  }),
  generateWithStyle('bp.log', bpPartialStyle.slashAt, '// @', {
    text: 'bp.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `// @bp.log {x} is {y}`',
  }),
  generateWithStyle('bp.expr', bpPartialStyle.slashAt, '// @', {
    text: 'bp.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `// @bp.expr x > 0`',
  }),

  // Completions triggered by "// @b"
  generateWithStyle('p', bpPartialStyle.slashAtB, '// @b', {
    text: 'p',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `// @bp`',
  }),
  generateWithStyle('p.hit', bpPartialStyle.slashAtB, '// @b', {
    text: 'p.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `// @bp.hit > 5`',
  }),
  generateWithStyle('p.log', bpPartialStyle.slashAtB, '// @b', {
    text: 'p.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `// @bp.log {x} is {y}`',
  }),
  generateWithStyle('p.expr', bpPartialStyle.slashAtB, '// @b', {
    text: 'p.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `// @bp.expr x > 0`',
  }),

  // Completions triggered by "// @bp"
  generateWithStyle('', bpPartialStyle.slashAtBp, '// @bp', {
    text: '',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `// @bp`',
  }),
  generateWithStyle('.hit', bpPartialStyle.slashAtBp, '// @bp', {
    text: '.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `// @bp.hit > 5`',
  }),
  generateWithStyle('.log', bpPartialStyle.slashAtBp, '// @bp', {
    text: '.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `// @bp.log {x} is {y}`',
  }),
  generateWithStyle('.expr', bpPartialStyle.slashAtBp, '// @bp', {
    text: '.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `// @bp.expr x > 0`',
  }),

  // Completions triggered by "// @bp."
  generateWithStyle('hit', bpPartialStyle.slashBp, '// @bp.', {
    text: 'hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `// @bp.hit > 5`',
  }),
  generateWithStyle('log', bpPartialStyle.slashBp, '// @bp.', {
    text: 'log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `// @bp.log {x} is {y}`',
  }),
  generateWithStyle('expr', bpPartialStyle.slashBp, '// @bp.', {
    text: 'expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `// @bp.expr x > 0`',
  }),
  generateWithStyle('disable', bpPartialStyle.slashBp, '// @bp.', {
    text: 'disable',
    detail: 'Add a disabled breakpoint.',
    document:
      'Adds a breakpoint that is initially disabled.\n- Usage: `// @bp.disable`',
  }),

  // Completions triggered by "// @bp.hit."
  generateWithStyle('disable', bpPartialStyle.slashBpHit, '// @bp.hit.', {
    text: 'disable ${condition}',
    detail: 'Add a disabled hit count breakpoint.',
    document:
      'Adds a hit count breakpoint that is initially disabled.\n- Usage: `// @bp.hit.disable > 5`',
  }),

  // Completions triggered by "// @bp.log."
  generateWithStyle('disable', bpPartialStyle.slashBpLog, '// @bp.log.', {
    text: 'disable ${expression}',
    detail: 'Add a disabled logpoint.',
    document:
      'Adds a logpoint that is initially disabled.\n- Usage: `// @bp.log.disable {x} is {y}`',
  }),

  // Completions triggered by "// @bp.expr."
  generateWithStyle('disable', bpPartialStyle.slashBpExpr, '// @bp.expr.', {
    text: 'disable ${expression}',
    detail: 'Add a disabled conditional breakpoint.',
    document:
      'Adds a conditional breakpoint that is initially disabled.\n- Usage: `// @bp.expr.disable x > 0`',
  }),
];

const hashBp: ISchema[] = [
  // Base completions (triggered by # )
  ...generate('@bp', [Style.hash], {
    text: '@bp',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `# @bp`',
  }),
  ...generate('@bp.log', [Style.hash], {
    text: '@bp.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `# @bp.log {x} is {y}`',
  }),
  ...generate('@bp.hit', [Style.hash], {
    text: '@bp.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `# @bp.hit > 5`',
  }),
  ...generate('@bp.expr', [Style.hash], {
    text: '@bp.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `# @bp.expr x > 0`',
  }),

  // Completions triggered by "# @"
  generateWithStyle('bp', hashPartialStyle.hashAt, '# @', {
    text: 'bp',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `# @bp`',
  }),
  generateWithStyle('bp.hit', hashPartialStyle.hashAt, '# @', {
    text: 'bp.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `# @bp.hit > 5`',
  }),
  generateWithStyle('bp.log', hashPartialStyle.hashAt, '# @', {
    text: 'bp.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `# @bp.log {x} is {y}`',
  }),
  generateWithStyle('bp.expr', hashPartialStyle.hashAt, '# @', {
    text: 'bp.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `# @bp.expr x > 0`',
  }),

  // Completions triggered by "# @b"
  generateWithStyle('p', hashPartialStyle.hashAtB, '# @b', {
    text: 'p',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `# @bp`',
  }),
  generateWithStyle('p.hit', hashPartialStyle.hashAtB, '# @b', {
    text: 'p.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `# @bp.hit > 5`',
  }),
  generateWithStyle('p.log', hashPartialStyle.hashAtB, '# @b', {
    text: 'p.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `# @bp.log {x} is {y}`',
  }),
  generateWithStyle('p.expr', hashPartialStyle.hashAtB, '# @b', {
    text: 'p.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `# @bp.expr x > 0`',
  }),

  // Completions triggered by "# @bp"
  generateWithStyle('', hashPartialStyle.hashAtBp, '# @bp', {
    text: '',
    detail: 'Add a basic breakpoint.',
    document: 'Sets a standard breakpoint at this line.\n- Usage: `# @bp`',
  }),
  generateWithStyle('.hit', hashPartialStyle.hashAtBp, '# @bp', {
    text: '.hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `# @bp.hit > 5`',
  }),
  generateWithStyle('.log', hashPartialStyle.hashAtBp, '# @bp', {
    text: '.log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `# @bp.log {x} is {y}`',
  }),
  generateWithStyle('.expr', hashPartialStyle.hashAtBp, '# @bp', {
    text: '.expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `# @bp.expr x > 0`',
  }),

  // Completions triggered by "# @bp."
  generateWithStyle('hit', hashPartialStyle.hashBp, '# @bp.', {
    text: 'hit ${condition}',
    detail: 'Add a hit count breakpoint.',
    document:
      'Breaks execution when the hit count condition is met (e.g., `<`, `>`, `>=`, `<=`, `==`).\n- Usage: `# @bp.hit > 5`',
  }),
  generateWithStyle('log', hashPartialStyle.hashBp, '# @bp.', {
    text: 'log ${expression}',
    detail: 'Add a logpoint with message interpolation.',
    document:
      'Logs a message when the breakpoint is hit. Expressions inside `{}` are evaluated.\n- Usage: `# @bp.log {x} is {y}`',
  }),
  generateWithStyle('expr', hashPartialStyle.hashBp, '# @bp.', {
    text: 'expr ${expression}',
    detail: 'Add a conditional breakpoint based on an expression.',
    document:
      'Breaks execution when the specified expression evaluates to true.\n- Usage: `# @bp.expr x > 0`',
  }),
  generateWithStyle('disable', hashPartialStyle.hashBp, '# @bp.', {
    text: 'disable',
    detail: 'Add a disabled breakpoint.',
    document:
      'Adds a breakpoint that is initially disabled.\n- Usage: `# @bp.disable`',
  }),

  // Completions triggered by "# @bp.hit."
  generateWithStyle('disable', hashPartialStyle.hashBpHit, '# @bp.hit.', {
    text: 'disable ${condition}',
    detail: 'Add a disabled hit count breakpoint.',
    document:
      'Adds a hit count breakpoint that is initially disabled.\n- Usage: `# @bp.hit.disable > 5`',
  }),

  // Completions triggered by "# @bp.log."
  generateWithStyle('disable', hashPartialStyle.hashBpLog, '# @bp.log.', {
    text: 'disable ${expression}',
    detail: 'Add a disabled logpoint.',
    document:
      'Adds a logpoint that is initially disabled.\n- Usage: `# @bp.log.disable {x} is {y}`',
  }),

  // Completions triggered by "# @bp.expr."
  generateWithStyle('disable', hashPartialStyle.hashBpExpr, '# @bp.expr.', {
    text: 'disable ${expression}',
    detail: 'Add a disabled conditional breakpoint.',
    document:
      'Adds a conditional breakpoint that is initially disabled.\n- Usage: `# @bp.expr.disable x > 0`',
  }),
];

export interface ISchemas {
  selector: DocumentSelector;
  schemas: ISchema[];
  triggerCharacters: string[];
}

export const supportedSchemas: ISchemas[] = [
  {
    selector: [
      Language.js,
      Language.jsx,
      Language.ts,
      Language.tsx,
      Language.vue,
      Language.golang,
      Language.java,
      Language.rust,
    ],
    schemas: [...bp],
    triggerCharacters: ['/', ' ', '.', '@', 'b', 'p'],
  },
  {
    selector: [Language.python, Language.ruby],
    schemas: [...hashBp],
    triggerCharacters: ['#', ' ', '.', '@', 'b', 'p'],
  },
];

function generate(
  name: string,
  styles: Style[],
  options: {
    text?: string;
    detail?: string;
    document?: string | MarkdownString;
  } = {}
): ISchema[] {
  if (!Array.isArray(styles)) {
    styles = [styles];
  }
  return styles.map((v) => {
    let prefix = '';
    let suffix = '';
    let style: matcher;
    switch (v) {
      case Style.slash:
        prefix = '// ';
        style = commentStyle.slash;
        break;
      case Style.star:
        prefix = '/* ';
        suffix = ' */';
        style = commentStyle.star;
        break;
      case Style.arrowDash:
        prefix = '<!-- ';
        suffix = ' -->';
        style = commentStyle.arrowDash;
        break;
      case Style.hash:
        prefix = '# ';
        style = commentStyle.hash;
        break;
      case Style.hashBracket:
        prefix = '#[ ';
        suffix = ' ]#';
        style = commentStyle.hashBracket;
        break;
      case Style.hashArrow:
        prefix = '<# ';
        suffix = ' #>';
        style = commentStyle.hashArrow;
        break;
      case Style.dashdash:
        prefix = '-- ';
        style = commentStyle.dashdash;
        break;
      case Style.dash:
        prefix = '- ';
        style = commentStyle.dash;
        break;
      case Style.quote:
        prefix = "' ";
        style = commentStyle.quote;
        break;
      case Style.percent:
        prefix = '% ';
        style = commentStyle.percent;
        break;
      case Style.semicolon:
        prefix = ';; ';
        style = commentStyle.semicolon;
        break;
      default:
        prefix = '// ';
        style = commentStyle.slash;
    }
    return {
      name: name.split(' ')[0],
      label: prefix + name + suffix,
      detail: options.detail,
      document:
        typeof options.document === 'string'
          ? new MarkdownString(options.document)
          : options.document,
      text: prefix + (options.text || name) + suffix,
      style,
    };
  });
}
