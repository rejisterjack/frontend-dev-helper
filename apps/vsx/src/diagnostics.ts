import * as vscode from 'vscode';

const severityMap: Record<string, vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information,
};

export class FDHDiagnostics {
  static instance: FDHDiagnostics;
  private collection: vscode.DiagnosticCollection;

  private constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('FDH');
  }

  static init(): FDHDiagnostics {
    FDHDiagnostics.instance = new FDHDiagnostics();
    return FDHDiagnostics.instance;
  }

  publish(
    diagnostics: Array<{
      file: string;
      line: number;
      column: number;
      severity: string;
      message: string;
      rule: string;
    }>,
  ): void {
    // Group by file
    const byFile = new Map<string, vscode.Diagnostic[]>();

    for (const d of diagnostics) {
      let uri: vscode.Uri;
      if (d.file.startsWith('/')) {
        uri = vscode.Uri.file(d.file);
      } else {
        const folders = vscode.workspace.workspaceFolders;
        uri = folders?.length
          ? vscode.Uri.joinPath(folders[0].uri, d.file)
          : vscode.Uri.file(d.file);
      }

      const line = Math.max(0, d.line - 1);
      const col = Math.max(0, d.column - 1);
      const range = new vscode.Range(line, col, line, col + 1);

      const diag = new vscode.Diagnostic(
        range,
        `${d.rule}: ${d.message}`,
        severityMap[d.severity] ?? vscode.DiagnosticSeverity.Warning,
      );
      diag.source = 'FDH';

      let list = byFile.get(uri.toString());
      if (!list) {
        list = [];
        byFile.set(uri.toString(), list);
      }
      list.push(diag);

      this.collection.set(uri, list);
    }
  }

  clear(): void {
    this.collection.clear();
  }

  dispose(): void {
    this.collection.dispose();
  }
}
