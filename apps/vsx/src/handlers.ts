import * as vscode from 'vscode';
import type { BridgeMessage } from './server';
import { highlightRange, clearHighlights, highlightLine } from './decorations';
import { FDHDiagnostics } from './diagnostics';

function resolveFilePath(file: string): vscode.Uri | null {
  // Source map path overrides (e.g. webpack://app/src/ → workspace/src/)
  const config = vscode.workspace.getConfiguration('fdh');
  const overrides = config.get<Record<string, string>>('sourceMapPathOverrides', {});
  for (const [pattern, replacement] of Object.entries(overrides)) {
    if (file.startsWith(pattern)) {
      file = replacement + file.slice(pattern.length);
      break;
    }
  }

  // Strip common source map prefixes
  file = file.replace(/^webpack:\/\/\//, '');
  file = file.replace(/^webpack-internal:\/\/\//, '');

  // Absolute path
  if (file.startsWith('/')) {
    return vscode.Uri.file(file);
  }

  // Try relative to each workspace folder
  const folders = vscode.workspace.workspaceFolders;
  if (folders) {
    for (const folder of folders) {
      const uri = vscode.Uri.joinPath(folder.uri, file);
      return uri;
    }
  }

  return vscode.Uri.file(file);
}

// ---------------------------------------------------------------------------
// Phase 1 handlers
// ---------------------------------------------------------------------------

export function handleJumpToSource(message: BridgeMessage): void {
  const { file, line, column } = (message.payload ?? {}) as {
    file: string; line: number; column: number;
  };
  if (!file) { return; }

  const uri = resolveFilePath(file);
  if (!uri) { return; }

  const ln = Math.max(0, (line ?? 1) - 1);
  const col = Math.max(0, (column ?? 0) - 1);

  clearHighlights();

  vscode.window.showTextDocument(uri, {
    selection: new vscode.Range(ln, col, ln, col),
    preview: false,
  }).then((editor) => {
    if (line > 0) {
      highlightLine(editor, line);
    }
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not open ${file}: ${err.message}`);
  });
}

export function handleOpenInEditor(message: BridgeMessage): void {
  const { file, line, column } = (message.payload ?? {}) as {
    file: string; line?: number; column?: number;
  };
  if (!file) { return; }

  const uri = resolveFilePath(file);
  if (!uri) { return; }

  const ln = line ? Math.max(0, line - 1) : 0;
  const col = column ? Math.max(0, column - 1) : 0;

  vscode.window.showTextDocument(uri, {
    selection: new vscode.Range(ln, col, ln, col),
    preview: false,
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not open ${file}: ${err.message}`);
  });
}

export function handleHighlightSource(message: BridgeMessage): void {
  const { file, startLine, startCol, endLine, endCol } = (message.payload ?? {}) as {
    file: string; startLine: number; startCol: number;
    endLine: number; endCol: number;
  };
  if (!file) { return; }

  const uri = resolveFilePath(file);
  if (!uri) { return; }

  clearHighlights();

  vscode.workspace.openTextDocument(uri).then((doc) => {
    return vscode.window.showTextDocument(doc, { preview: false });
  }).then((editor) => {
    highlightRange(editor, startLine, startCol, endLine, endCol);
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not highlight ${file}: ${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// Phase 1 — InspectElement
// ---------------------------------------------------------------------------

export function handleInspectElement(message: BridgeMessage): void {
  const { selector, html } = (message.payload ?? {}) as {
    selector: string; html: string; computedStyles: Record<string, string>;
  };

  const output = vscode.window.createOutputChannel('FDH Inspector');
  output.appendLine(`Selector: ${selector}`);
  output.appendLine(`HTML: ${html?.slice(0, 500) || '(none)'}`);
  output.appendLine('---');
  output.show(true);
}

// ---------------------------------------------------------------------------
// Phase 1 — ApplyFix (existing)
// ---------------------------------------------------------------------------

export function handleApplyFix(message: BridgeMessage): void {
  const { file, content, description } = (message.payload ?? {}) as {
    file: string; content: string; description: string;
  };
  if (!file || !content) { return; }

  const uri = resolveFilePath(file);
  if (!uri) { return; }

  vscode.workspace.openTextDocument(uri).then((doc) => {
    return vscode.window.showTextDocument(doc).then((editor) => {
      const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
      );

      editor.edit((builder) => {
        builder.replace(fullRange, content);
      });

      vscode.window.showInformationMessage(`FDH: ${description || 'Fix applied'}`);
    });
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not apply fix: ${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// Phase 2 — CSS edits
// ---------------------------------------------------------------------------

export function handleApplyCSSEdit(message: BridgeMessage): void {
  const { file, edits } = (message.payload ?? {}) as {
    file: string;
    edits: Array<{ selector: string; property: string; value: string; oldValue: string }>;
  };
  if (!file || !edits?.length) { return; }

  const uri = resolveFilePath(file);
  if (!uri) { return; }

  vscode.workspace.openTextDocument(uri).then((doc) => {
    const wsEdit = new vscode.WorkspaceEdit();

    for (const edit of edits) {
      // Find the selector in the file
      for (let i = 0; i < doc.lineCount; i++) {
        const lineText = doc.lineAt(i).text;
        if (lineText.includes(edit.selector)) {
          // Find the property within this rule block
          let braceDepth = 0;
          let foundProp = false;
          for (let j = i; j < doc.lineCount && j < i + 200; j++) {
            const text = doc.lineAt(j).text;
            for (const ch of text) {
              if (ch === '{') braceDepth++;
              if (ch === '}') braceDepth--;
            }

            const propMatch = text.match(new RegExp(`(\\s*${escapeRegex(edit.property)}\\s*:\\s*)([^;]+)(;)`));
            if (propMatch && braceDepth > 0) {
              const startCol = propMatch.index! + propMatch[1].length;
              const endCol = startCol + propMatch[2].length;
              wsEdit.replace(uri, new vscode.Range(j, startCol, j, endCol), edit.value);
              foundProp = true;
              break;
            }

            if (braceDepth <= 0 && text.includes('}')) break;
          }
          if (foundProp) break;
        }
      }
    }

    vscode.workspace.applyEdit(wsEdit).then((success) => {
      if (success) {
        vscode.window.showInformationMessage(`FDH: Applied ${edits.length} CSS edit(s)`);
      }
    });
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not apply CSS edits: ${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// Phase 3 — Fix preview and application
// ---------------------------------------------------------------------------

export function handlePreviewFix(message: BridgeMessage): void {
  const { file, original, fixed, description, fixId } = (message.payload ?? {}) as {
    file: string; original: string; fixed: string;
    description: string; fixId: string;
  };
  if (!file || !fixed) { return; }

  // Write original and fixed content to temp URIs for diff view
  const uri = resolveFilePath(file) ?? vscode.Uri.file(file);

  vscode.workspace.openTextDocument(uri).then(async (doc) => {
    const originalContent = doc.getText();

    // Create a virtual document for the fixed version
    const fixedUri = vscode.Uri.parse(`untitled:FDH-Fix-${fixId}`);
    const fixedDoc = await vscode.workspace.openTextDocument(fixedUri);
    const fixedEditor = await vscode.window.showTextDocument(fixedDoc, { preview: true });

    await fixedEditor.edit((builder) => {
      const fullRange = new vscode.Range(
        fixedDoc.lineAt(0).range.start,
        fixedDoc.lineAt(Math.max(0, fixedDoc.lineCount - 1)).range.end,
      );
      builder.replace(fullRange, fixed);
    });

    // Show diff
    await vscode.commands.executeCommand(
      'vscode.diff',
      uri,
      fixedUri,
      `FDH Fix: ${description} — ${file}`,
    );

    const choice = await vscode.window.showInformationMessage(
      `Apply this fix? ${description}`,
      'Apply',
      'Reject',
    );

    if (choice === 'Apply') {
      const editor = await vscode.window.showTextDocument(doc);
      const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
      );
      await editor.edit((builder) => {
        builder.replace(fullRange, fixed);
      });
      vscode.window.showInformationMessage('FDH: Fix applied');
    }

    // Clean up untitled document
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not preview fix: ${err.message}`);
  });
}

export function handleApplySourceFix(message: BridgeMessage): void {
  const { file, edits } = (message.payload ?? {}) as {
    file: string;
    edits: Array<{
      range: { sl: number; sc: number; el: number; ec: number };
      newText: string;
    }>;
  };
  if (!file || !edits?.length) { return; }

  const uri = resolveFilePath(file);
  if (!uri) { return; }

  const wsEdit = new vscode.WorkspaceEdit();

  for (const edit of edits) {
    const range = new vscode.Range(
      Math.max(0, edit.range.sl - 1),
      Math.max(0, edit.range.sc - 1),
      Math.max(0, edit.range.el - 1),
      Math.max(0, edit.range.ec - 1),
    );
    wsEdit.replace(uri, range, edit.newText);
  }

  vscode.workspace.applyEdit(wsEdit).then((success) => {
    if (success) {
      vscode.window.showInformationMessage(`FDH: Applied ${edits.length} edit(s) to ${file}`);
    }
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not apply source fix: ${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// Phase 4 — Diagnostics
// ---------------------------------------------------------------------------

export function handlePublishDiagnostics(message: BridgeMessage): void {
  const { diagnostics } = (message.payload ?? {}) as {
    diagnostics: Array<{
      file: string; line: number; column: number;
      severity: string; message: string; rule: string;
    }>;
  };
  if (!diagnostics) { return; }

  FDHDiagnostics.instance.publish(diagnostics);
}

export function handleClearDiagnostics(_message: BridgeMessage): void {
  FDHDiagnostics.instance.clear();
}

// ---------------------------------------------------------------------------
// Phase 4 — File creation
// ---------------------------------------------------------------------------

export function handleCreateFile(message: BridgeMessage): void {
  const { filePath, content, openAfterCreate } = (message.payload ?? {}) as {
    filePath: string; content: string; openAfterCreate: boolean;
  };
  if (!filePath) { return; }

  const uri = resolveFilePath(filePath);
  if (!uri) { return; }

  const encoder = new TextEncoder();
  vscode.workspace.fs.writeFile(uri, encoder.encode(content)).then(() => {
    if (openAfterCreate) {
      vscode.window.showTextDocument(uri);
    }
    vscode.window.showInformationMessage(`FDH: Created ${filePath}`);
  }).then(undefined, (err) => {
    vscode.window.showWarningMessage(`FDH: Could not create ${filePath}: ${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// Handler routing
// ---------------------------------------------------------------------------

const handlerMap: Record<string, (message: BridgeMessage) => void> = {
  JumpToSource: handleJumpToSource,
  OpenInEditor: handleOpenInEditor,
  ApplyFix: handleApplyFix,
  InspectElement: handleInspectElement,
  HighlightSource: handleHighlightSource,
  ApplyCSSEdit: handleApplyCSSEdit,
  PreviewFix: handlePreviewFix,
  ApplySourceFix: handleApplySourceFix,
  PublishDiagnostics: handlePublishDiagnostics,
  ClearDiagnostics: handleClearDiagnostics,
  CreateFile: handleCreateFile,
};

export function handleMessage(message: BridgeMessage): void {
  const handler = handlerMap[message.type];
  if (handler) {
    handler(message);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
