/**
 * This is a modified version of the ripgrep.js source file
 * written by Nigel Scott (github.com/Gruntfuggly/todo-tree)
 */

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import * as path from 'node:path';

interface RipgrepOptions {
  rgPath: string;
  additional?: string;
  outputChannel?: {
    appendLine: (text: string) => void;
  };
  regex?: string;
  globs?: string[];
  patternFilePath?: string;
  unquotedRegex?: string;
  filename?: string;
  maxBuffer?: number;
}

let currentProcess: childProcess.ChildProcess | undefined;

export function ripgrepPath(): string {
  function exeName() {
    var isWin = /^win/.test(process.platform);
    return isWin ? 'rg.exe' : 'rg';
  }

  function exePathIsDefined(rgExePath: string): string {
    return fs.existsSync(rgExePath) ? rgExePath : '';
  }

  let rgPath;

  rgPath = exePathIsDefined(
    vscode.workspace.getConfiguration(
      'comment-directive-breakpoints.ripgrep'
    ).path
  );
  if (rgPath) {
    return rgPath;
  }

  rgPath = exePathIsDefined(
    path.join(vscode.env.appRoot, 'node_modules/vscode-ripgrep/bin/', exeName())
  );
  if (rgPath) {
    return rgPath;
  }

  rgPath = exePathIsDefined(
    path.join(
      vscode.env.appRoot,
      'node_modules.asar.unpacked/vscode-ripgrep/bin/',
      exeName()
    )
  );
  if (rgPath) {
    return rgPath;
  }

  rgPath = exePathIsDefined(
    path.join(
      vscode.env.appRoot,
      'node_modules/@vscode/ripgrep/bin/',
      exeName()
    )
  );
  if (rgPath) {
    return rgPath;
  }

  rgPath = exePathIsDefined(
    path.join(
      vscode.env.appRoot,
      'node_modules.asar.unpacked/@vscode/ripgrep/bin/',
      exeName()
    )
  );
  if (rgPath) {
    return rgPath;
  }

  return rgPath;
}



class RipgrepError extends Error {
  stderr: string;

  constructor(error: string, stderr: string) {
    super(error);
    this.stderr = stderr;
  }
}

function formatResults(stdout: string): Match[] {
  stdout = stdout.trim();

  if (!stdout) {
    return [];
  }

  return stdout.split('\n').map((line: string) => new Match(line));
}

export function ripgrepSearch(
  cwd: string,
  options: RipgrepOptions
): Promise<Match[]> {
  function debug(text: string): void {
    if (options.outputChannel) {
      const now = new Date();
      options.outputChannel.appendLine(
        now.toLocaleTimeString('en', { hour12: false }) +
          '.' +
          String(now.getMilliseconds()).padStart(3, '0') +
          ' ' +
          text
      );
    }
  }

  if (!cwd) {
    return Promise.reject({ error: 'No `cwd` provided' });
  }

  if (arguments.length === 1) {
    return Promise.reject({ error: 'No search term provided' });
  }

  options.regex = options.regex || '';
  options.globs = options.globs || [];

  let rgPath = options.rgPath;
  const isWin = /^win/.test(process.platform);

  if (!fs.existsSync(rgPath)) {
    return Promise.reject({
      error: 'ripgrep executable not found (' + rgPath + ')',
    });
  }
  if (!fs.existsSync(cwd)) {
    return Promise.reject({ error: 'root folder not found (' + cwd + ')' });
  }

  if (isWin) {
    rgPath = '"' + rgPath + '"';
  } else {
    rgPath = rgPath.replace(/ /g, '\\ ');
  }

  let execString =
    rgPath +
    ' -P --no-messages --vimgrep -H --column --line-number --color never ' +
    (options.additional ?? '');


  if (options.patternFilePath) {
    debug('Writing pattern file:' + options.patternFilePath);
    fs.writeFileSync(options.patternFilePath, options.unquotedRegex + '\n');
  }

  if (!options.patternFilePath || !fs.existsSync(options.patternFilePath)) {
    debug('No pattern file found - passing regex in command');
    execString = `${execString} -e '${options.regex}'`;
  } else {
    execString = `${execString} -f \"${options.patternFilePath}\"`;
    debug('Pattern:' + options.unquotedRegex);
  }

  execString = options.globs.reduce((command: string, glob: string) => {
    return `${command} -g \'${glob}\'`;
  }, execString);

  if (options.filename) {
    let filename = options.filename;
    if (isWin && filename.slice(-1) === '\\') {
      filename = filename.substr(0, filename.length - 1);
    }
    execString += ' "' + filename + '"';
  } else {
    execString += ' "' + cwd + '"';
  }

  debug('Command: ' + execString);

  return new Promise(function (resolve, reject) {
    // The default for omitting maxBuffer, according to Node docs, is 200kB.
    // We'll explicitly give that here if a custom value is not provided.
    // Note that our options value is in KB, so we have to convert to bytes.
    const maxBuffer = (options.maxBuffer || 200) * 1024;
    currentProcess = childProcess.exec(execString, { cwd, maxBuffer });
    let results = '';
    let stderrOutput = '';

    currentProcess.stdout?.on('data', function (data) {
      debug('Search results:\n' + data);
      results += data;
    });

    currentProcess.stderr?.on('data', function (data) {
      debug('Search stderr:\n' + data);
      stderrOutput += data;
    });

    currentProcess.on('close', function (code) {
      if (
        options.patternFilePath &&
        fs.existsSync(options.patternFilePath) === true
      ) {
        fs.unlinkSync(options.patternFilePath);
      }
      if (code && code !== 0 && stderrOutput) {
        reject(new RipgrepError(stderrOutput, ''));
      } else {
        resolve(formatResults(results));
      }
    });
  });
}

export function killRipgrepProcess() {
  if (currentProcess !== undefined) {
    currentProcess.kill('SIGINT');
  }
}

export class Match {
  fsPath: string;
  line: number;
  column: number;
  match: string;


  constructor(matchText: string) {
    // Detect file, line number and column which is formatted in the
    // following format: {file}:{line}:{column}:{code match}
    const regex = RegExp(
      /^(?<file>.*):(?<line>\d+):(?<column>\d+):(?<comment>.*)/
    );

    const match = regex.exec(matchText);
    if (match && match.groups) {
      this.fsPath = match.groups.file;
      this.line = parseInt(match.groups.line);
      this.column = parseInt(match.groups.column);
      this.match = match.groups.comment;
    } else // Fall back to old method
    {
      this.fsPath = '';

      if (matchText.length > 1 && matchText[1] === ':') {
        this.fsPath = matchText.substr(0, 2);
        matchText = matchText.substr(2);
      }
      const parts = matchText.split(':');
      const hasColumn = parts.length === 4;
      this.fsPath += parts.shift();
      this.line = parseInt(parts.shift()!);
      if (hasColumn === true) {
        this.column = parseInt(parts.shift()!);
      } else {
        this.column = 1;
      }
      this.match = parts.join(':');
    }
  }
}
