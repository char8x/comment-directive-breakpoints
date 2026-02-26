import {
  window,
  workspace,
  commands,
  languages,
  debug as vscodeDebug,
  ExtensionContext,
  SourceBreakpoint,
  Selection,
  Position,
  TextDocument,
  CompletionItem,
  CompletionList,
  TabInputText,
  Uri,
  LogOutputChannel,
} from 'vscode';
import { extractBreakpoints } from './lib/vscode.js';
import { ISchemas, supportedSchemas } from './lib/schema.js';
import { CommentCompletionItem } from './lib/vscode.js';
import { calculateCompletions } from './lib/completion.js';
import {
  findCommentNodeAtPosition,
  findRelatedCodeNode,
  parseBreakpointComment,
  BREAKPOINT_COMMENT_LOOSE_REGEX,
  extToLanguageId,
  getSearchGlobs,
} from './lib/common.js';
import {
  killRipgrepProcess,
  ripgrepPath,
  ripgrepSearch,
} from './lib/ripgrep.js';

interface IFocusArg {
  start: Position;
  end: Position;
}

let logger: LogOutputChannel | null = null;

function registerCommandForGenerateOnOpenedFiles() {
  return commands.registerCommand(
    'comment-directive-breakpoints.generateOnOpenedFiles',
    async function () {
      logger?.info('Command: Generate On Opened Files started');
      const config = workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      const supportedLanguages = config.get<string[]>(
        'general.supportedLanguages'
      );
      const mode = config.get<string>(
        'general.breakpointManagementMode',
        'append'
      );

      const allOpenedFiles = window.tabGroups.all
        .flatMap((group) => group.tabs)
        .map((tab) => {
          if (tab.input instanceof TabInputText) {
            return tab.input.uri;
          }
          return null;
        })
        .filter((uri): uri is Uri => {
          if (!uri) {
            return false;
          }
          const languageId = extToLanguageId(uri.fsPath);
          if (languageId === '') {
            return false;
          }
          if (supportedLanguages && !supportedLanguages.includes(languageId)) {
            return false;
          }
          return true;
        });

      logger?.info(`Processing ${allOpenedFiles.length} opened files`);

      try {
        const allBreakpoints = await Promise.all(
          allOpenedFiles.map(async (uri) => {
            const breakpoints = await extractBreakpoints(
              uri,
              extToLanguageId(uri.fsPath)
            );
            logger?.debug(
              `Extracted ${breakpoints.length} breakpoints from ${uri.fsPath}`
            );
            return breakpoints.flat();
          })
        ).then((bps) => bps.flat());

        if (mode === 'replace') {
          const repetitiveBreakpoints = vscodeDebug.breakpoints.filter(
            (bp) => bp instanceof SourceBreakpoint
          );
          vscodeDebug.removeBreakpoints(repetitiveBreakpoints);
        }

        vscodeDebug.addBreakpoints(allBreakpoints);

        logger?.info(
          `Generated ${allBreakpoints.length} breakpoints from opened files`
        );
        window.showInformationMessage(
          `Task completed: ${allBreakpoints.length} breakpoints have been generated.`
        );
      } catch (error) {
        logger?.error(
          `Error generating breakpoints from opened files: ${error}`
        );
        window.showErrorMessage(
          'Failed to generate breakpoints. See output for details.'
        );
      }
    }
  );
}

function registerCommandForGenerateAll() {
  return commands.registerCommand(
    'comment-directive-breakpoints.generateAll',
    async function () {
      logger?.info('Command: Generate All Breakpoints started');
      if (!workspace.workspaceFolders) {
        window.showErrorMessage('No workspace folder is open.');
        logger?.warn('No workspace folder is open');
        return;
      }

      const config = workspace.getConfiguration(
        'comment-directive-breakpoints'
      );
      const supportedLanguages = config.get<string[]>(
        'general.supportedLanguages'
      );
      const mode = config.get<string>(
        'general.breakpointManagementMode',
        'append'
      );
      const globs = getSearchGlobs(supportedLanguages);

      if (globs.length === 0) {
        window.showWarningMessage(
          'No supported languages are enabled. Please check your settings.'
        );
        logger?.warn('No supported languages enabled, skipping generation');
        return;
      }

      try {
        // Collect all breakpoints from all workspace folders
        const folderResults = await Promise.all(
          workspace.workspaceFolders.map(async (folder) => {
            const matches = await ripgrepSearch(folder.uri.fsPath, {
              rgPath: ripgrepPath(),
              globs: globs,
              regex: BREAKPOINT_COMMENT_LOOSE_REGEX.source,
            });
            if (!matches || matches.length === 0) {
              logger?.info(
                `No directive-triggered breakpoints found in folder: ${folder.uri.fsPath}`
              );
              return [];
            }
            logger?.info(
              `Found ${matches.length} directive comments in ${folder.uri.fsPath}`
            );
            // Process unique files and collect breakpoints
            const uniqueFiles = Array.from(
              new Set(matches.map((m) => m.fsPath))
            );
            const fileResults = await Promise.all(
              uniqueFiles.map(async (m) => {
                const uri = Uri.file(m);
                return extractBreakpoints(uri, extToLanguageId(uri.fsPath));
              })
            );
            return fileResults.flat();
          })
        );

        const allBreakpoints = folderResults.flat();

        if (mode === 'replace') {
          const repetitiveBreakpoints = vscodeDebug.breakpoints.filter(
            (bp) => bp instanceof SourceBreakpoint
          );
          vscodeDebug.removeBreakpoints(repetitiveBreakpoints);
        }

        vscodeDebug.addBreakpoints(allBreakpoints);

        logger?.info(
          `Generated ${allBreakpoints.length} breakpoints from workspace`
        );
        window.showInformationMessage(
          `Task completed: ${allBreakpoints.length} breakpoints have been generated.`
        );
      } catch (error) {
        logger?.error(`Error generating breakpoints: ${error}`);
        window.showErrorMessage(
          'Failed to generate breakpoints. See output for details.'
        );
      }
    }
  );
}

function handleFileSaved() {
  return workspace.onDidSaveTextDocument(async (e) => {
    const config = workspace.getConfiguration(
      'comment-directive-breakpoints'
    );
    const supportedLanguages = config.get<string[]>(
      'general.supportedLanguages'
    );
    if (supportedLanguages && !supportedLanguages.includes(e.languageId)) {
      logger?.debug(
        `Language ${e.languageId} is disabled for auto-generation, skipping ${e.uri.fsPath}`
      );
      return;
    }

    const generateOnSave = config.get<boolean>('general.generateOnSave', true);
    if (!generateOnSave) {
      logger?.debug(
        'Auto-generate is disabled, skipping breakpoint generation'
      );
      return;
    }

    const mode = config.get<string>(
      'general.breakpointManagementMode',
      'append'
    );

    try {
      logger?.info(`Generating breakpoints for saved file: ${e.uri.fsPath}`);
      const breakpoints = await extractBreakpoints(e.uri, e.languageId);

      if (mode === 'replace') {
        const repetitiveBreakpoints = vscodeDebug.breakpoints.filter(
          (bp) =>
            bp instanceof SourceBreakpoint &&
            bp.location.uri.toString() === e.uri.toString()
        );
        vscodeDebug.removeBreakpoints(repetitiveBreakpoints);
      }

      vscodeDebug.addBreakpoints(breakpoints);
      logger?.info(
        `Updated ${breakpoints.length} breakpoints for ${e.uri.fsPath}`
      );
    } catch (error) {
      logger?.error(
        `Error updating breakpoints on save for ${e.uri.fsPath}: ${error}`
      );
    }
  });
}

function registerCompletions(schema: ISchemas) {
  return languages.registerCompletionItemProvider(
    (schema.selector as string[]).map((v) => {
      return {
        scheme: 'file',
        language: v,
      };
    }),
    {
      provideCompletionItems: async (
        document: TextDocument,
        position: Position
      ) => {
        const commentNode = await findCommentNodeAtPosition(
          document.languageId,
          document.getText(),
          position.line,
          position.character
        );
        if (!commentNode) {
          logger?.debug(
            `No comment node found at ${document.uri.fsPath}:${position.line}:${position.character}`
          );
          return [];
        }

        const lineContent = document.lineAt(position.line).text;
        const expressionState = parseBreakpointComment(lineContent);

        if (
          expressionState &&
          (expressionState.type.includes('log') ||
            expressionState.type.includes('expr')) &&
          expressionState.expressionStartOffset >
            expressionState.typeEndOffset &&
          position.character > expressionState.typeEndOffset
        ) {
          logger?.debug(
            `Providing code completions for ${expressionState.type} directive`
          );
          // If we are already fetching default completions, return empty to prevent recursion
          if (isFetchingDefaultCompletions) {
            return [];
          }
          isFetchingDefaultCompletions = true;
          try {
            const relatedCodeNode = findRelatedCodeNode(commentNode);
            if (!relatedCodeNode) {
              logger?.debug(
                'No related code node found for directive completion'
              );
              return [];
            }

            // Request completions at the start of the code node
            const codePosition = new Position(
              relatedCodeNode.range().start.line,
              relatedCodeNode.range().start.column
            );

            const completions = await commands.executeCommand<CompletionList>(
              'vscode.executeCompletionItemProvider',
              document.uri,
              codePosition
            );

            if (!completions || !completions.items) {
              logger?.debug('No code completions available');
              return [];
            }
            logger?.debug(
              `Fetched ${completions.items.length} code completion items`
            );

            // Adjust completion ranges to the current cursor position
            const wordRange = document.getWordRangeAtPosition(position);

            return completions.items.map((item) => {
              const newItem = new CompletionItem(item.label, item.kind);
              newItem.detail = item.detail;
              newItem.documentation = item.documentation;
              newItem.insertText = item.insertText;
              newItem.range = wordRange;
              newItem.sortText = item.sortText;
              newItem.filterText = item.filterText;
              return newItem;
            });
          } catch (error) {
            logger?.error(`Error fetching default completions: ${error}`);
            return [];
          } finally {
            isFetchingDefaultCompletions = false;
          }
        }

        const candidates = calculateCompletions(
          lineContent,
          position.character,
          schema.schemas
        );
        return candidates.map(
          (candidate) =>
            new CommentCompletionItem(candidate.schema, document, position)
        );
      },
    },
    ...schema.triggerCharacters
  );
}

// Guard variable to prevent infinite recursion when fetching default completions
let isFetchingDefaultCompletions = false;

export function activate(context: ExtensionContext) {
  logger = window.createOutputChannel('Comment Directive Breakpoints', {
    log: true,
  });
  context.subscriptions.push(logger);
  logger?.info('Comment Directive Breakpoints extension activated');

  context.subscriptions.push(registerCommandForGenerateAll());
  context.subscriptions.push(registerCommandForGenerateOnOpenedFiles());

  const focusCommand = commands.registerCommand(
    'comment-directive-breakpoints.comment-autocomplete.focus',
    (argv: IFocusArg) => {
      const editor = window.activeTextEditor;
      if (!editor) {
        return;
      }
      editor.selection = new Selection(argv.start, argv.end);
    }
  );
  context.subscriptions.push(focusCommand);

  for (const schema of supportedSchemas) {
    context.subscriptions.push(registerCompletions(schema));
  }

  context.subscriptions.push(handleFileSaved());
}

export function deactivate() {
  logger?.info('Comment Directive Breakpoints extension deactivated');
  killRipgrepProcess();
}
