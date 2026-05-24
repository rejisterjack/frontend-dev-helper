import * as vscode from 'vscode';
import { BridgeServer } from './server';
import { handleMessage } from './handlers';
import { FDHDiagnostics } from './diagnostics';

let server: BridgeServer;
let statusItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

function updateStatus(): void {
  if (!statusItem) { return; }
  const count = server.clientCount;
  if (server.running) {
    statusItem.text = count > 0 ? `$(plug) FDH (${count})` : '$(plug) FDH';
    statusItem.tooltip = count > 0
      ? `FDH Browser Bridge — ${count} client(s) connected`
      : 'FDH Browser Bridge — waiting for connection';
    statusItem.backgroundColor = undefined;
  } else {
    statusItem.text = '$(plug) FDH (off)';
    statusItem.tooltip = 'FDH Browser Bridge — stopped';
    statusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

function startServer(port?: number): void {
  const config = vscode.workspace.getConfiguration('fdh');
  const p = port ?? config.get<number>('port', 9456);

  server.start(p);
  outputChannel.appendLine(`[FDH] Server started on port ${p}`);
  updateStatus();
}

export function activate(context: vscode.ExtensionContext): void {
  try {
  server = new BridgeServer();
  outputChannel = vscode.window.createOutputChannel('FDH Bridge');

  // Status bar
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusItem.command = 'fdh.showStatus';
  statusItem.show();

  // Message handler
  server.onMessage((message) => {
    outputChannel.appendLine(`[FDH] <- ${message.type} ${JSON.stringify(message.payload ?? {}).slice(0, 200)}`);
    handleMessage(message);
    updateStatus();
  });

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('fdh.restartServer', () => {
      server.stop();
      outputChannel.appendLine('[FDH] Server stopped');
      startServer();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('fdh.showStatus', () => {
      outputChannel.appendLine(`[FDH] Status: ${server.running ? 'running' : 'stopped'}, clients: ${server.clientCount}, port: ${server.port}`);
      outputChannel.show(true);
    }),
  );

  // Settings change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('fdh.port')) {
        const newPort = vscode.workspace.getConfiguration('fdh').get<number>('port', 9456);
        if (newPort !== server.port) {
          server.stop();
          startServer(newPort);
        }
      }
    }),
  );

  // Initialize diagnostics
  FDHDiagnostics.init();
  context.subscriptions.push(FDHDiagnostics.instance);

  context.subscriptions.push(statusItem, outputChannel);

  // Auto-start
  const config = vscode.workspace.getConfiguration('fdh');
  if (config.get<boolean>('autoStart', true)) {
    startServer();
  }

  updateStatus();
  } catch (err) {
    vscode.window.showErrorMessage(`FDH Bridge failed to activate: ${err}`);
  }
}

export function deactivate(): void {
  server?.stop();
  outputChannel?.appendLine('[FDH] Extension deactivated');
}
