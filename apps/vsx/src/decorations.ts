import * as vscode from 'vscode';

const highlightDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 213, 79, 0.3)',
  border: '1px solid rgba(255, 213, 79, 0.6)',
  borderRadius: '2px',
});

let activeDecorations = new Map<string, vscode.Range[]>();

export function highlightRange(
  editor: vscode.TextEditor,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
): void {
  const range = new vscode.Range(
    Math.max(0, startLine - 1),
    Math.max(0, startCol - 1),
    Math.max(0, endLine - 1),
    Math.max(0, endCol - 1),
  );

  const key = editor.document.uri.toString();
  const ranges = [...(activeDecorations.get(key) ?? []), range];
  activeDecorations.set(key, ranges);

  editor.setDecorations(highlightDecoration, ranges);
}

export function clearHighlights(editor?: vscode.TextEditor): void {
  if (editor) {
    const key = editor.document.uri.toString();
    activeDecorations.delete(key);
    editor.setDecorations(highlightDecoration, []);
  } else {
    for (const ed of vscode.window.visibleTextEditors) {
      ed.setDecorations(highlightDecoration, []);
    }
    activeDecorations.clear();
  }
}

export function highlightLine(editor: vscode.TextEditor, line: number): void {
  highlightRange(editor, line, 1, line, Number.MAX_SAFE_INTEGER);
}
