import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/use-settings-store';
import { testConnection } from '@/lib/llm-service';
import { FIREWORKS_MODELS } from '@/lib/providers/fireworks-provider';
import { OPENROUTER_MODELS } from '@/lib/providers/openrouter-provider';
import { ZAI_MODELS } from '@/lib/providers/zai-provider';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

function SettingRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      {children}
    </div>
  );
}

export function SettingsPanel() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const showInactiveTools = useSettingsStore((s) => s.showInactiveTools);
  const enableTelemetry = useSettingsStore((s) => s.enableTelemetry);
  const ai = useSettingsStore((s) => s.ai);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const updateAIConfig = useSettingsStore((s) => s.updateAIConfig);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);
  const github = useSettingsStore((s) => s.github);
  const updateGitHubConfig = useSettingsStore((s) => s.updateGitHubConfig);
  const vscode = useSettingsStore((s) => s.vscode);
  const updateVSCodeConfig = useSettingsStore((s) => s.updateVSCodeConfig);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [vscodeConnected, setVscodeConnected] = useState(false);
  const [modelTier, setModelTier] = useState<'free' | 'paid'>('free');

  const isOllama = ai.provider === 'ollama';
  const isFireworks = ai.provider === 'fireworks';
  const isZAI = ai.provider === 'zai';
  const isProviderWithModels = isFireworks || ai.provider === 'openrouter' || isZAI;

  useEffect(() => {
    if (!vscode.enabled) {
      setVscodeConnected(false);
      return;
    }
    const checkStatus = () => {
      chrome.runtime.sendMessage({ type: 'VSCODE_GET_STATUS' }, (response) => {
        if (response) {
          setVscodeConnected(response.connected ?? false);
        }
      });
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [vscode.enabled]);

  const handleVSCodeInit = () => {
    chrome.runtime.sendMessage({ type: 'VSCODE_INIT_BRIDGE', payload: { port: vscode.port } });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const result = await testConnection({
        apiKey: ai.apiKey,
        model: ai.model,
        baseUrl: ai.baseUrl,
        provider: ai.provider,
      });
      setConnectionStatus(result);
    } catch {
      setConnectionStatus({ success: false, message: 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollArea className="h-full">
    <div className="flex flex-col px-4 py-3">
      {/* Appearance */}
      <SectionHeading>Appearance</SectionHeading>
      <div className="mt-2">
        <SettingRow>
          <Label className="text-xs">Theme</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
            <SelectTrigger className="w-24 h-7 text-xs bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light" className="text-xs">Light</SelectItem>
              <SelectItem value="dark" className="text-xs">Dark</SelectItem>
              <SelectItem value="system" className="text-xs">System</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow>
          <Label className="text-xs">Show inactive tools</Label>
          <Switch checked={showInactiveTools} onCheckedChange={(v) => updateSetting('showInactiveTools', v)} />
        </SettingRow>
      </div>

      <Separator className="my-3" />

      {/* AI Configuration */}
      <SectionHeading>AI Configuration</SectionHeading>
      <div className="mt-2">
        <SettingRow>
          <Label className="text-xs">Enable AI features</Label>
          <Switch checked={ai.enabled} onCheckedChange={(v) => updateAIConfig({ enabled: v })} />
        </SettingRow>
        {ai.enabled && (
          <>
            <SettingRow>
              <Label className="text-xs">Provider</Label>
              <Select value={ai.provider} onValueChange={(v) => {
                const newProvider = v as 'openrouter' | 'ollama' | 'fireworks' | 'zai' | 'custom';
                const updates: Partial<typeof ai> = { provider: newProvider };
                if (newProvider === 'ollama') {
                  updates.baseUrl = 'http://localhost:11434';
                  updates.model = 'llama3';
                } else if (newProvider === 'openrouter') {
                  updates.baseUrl = 'https://openrouter.ai/api/v1';
                  updates.model = OPENROUTER_MODELS[0].id;
                } else if (newProvider === 'fireworks') {
                  updates.baseUrl = 'https://api.fireworks.ai/inference/v1';
                  updates.model = FIREWORKS_MODELS[0].id;
                } else if (newProvider === 'zai') {
                  updates.baseUrl = 'https://api.z.ai/api/paas/v4';
                  updates.model = ZAI_MODELS.find((m) => m.tier === 'free')!.id;
                }
                updateAIConfig(updates);
                setConnectionStatus(null);
              }}>
                <SelectTrigger className="w-28 h-7 text-xs bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fireworks" className="text-xs">Fireworks</SelectItem>
                  <SelectItem value="zai" className="text-xs">Z.AI</SelectItem>
                  <SelectItem value="openrouter" className="text-xs">OpenRouter</SelectItem>
                  <SelectItem value="ollama" className="text-xs">Ollama (Local)</SelectItem>
                  <SelectItem value="custom" className="text-xs">Custom</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            {!isOllama && (
              <div className="flex flex-col gap-1.5 py-2">
                <Label className="text-xs">API Key</Label>
                <Input
                  type="password"
                  value={ai.apiKey}
                  onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                  placeholder={isFireworks ? 'Get key at fireworks.ai' : isZAI ? 'Get key at z.ai' : 'sk-...'}
                  className="h-7 text-xs bg-secondary border-0 rounded-md"
                />
              </div>
            )}
            {isProviderWithModels && (
              <>
                <SettingRow>
                  <Label className="text-xs">Tier</Label>
                  <div className="flex gap-0.5">
                    <Button
                      variant={modelTier === 'free' ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-2.5 text-[0.65rem]"
                      onClick={() => setModelTier('free')}
                    >
                      Free
                    </Button>
                    <Button
                      variant={modelTier === 'paid' ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-2.5 text-[0.65rem]"
                      onClick={() => setModelTier('paid')}
                    >
                      Paid
                    </Button>
                  </div>
                </SettingRow>
                <SettingRow>
                  <Label className="text-xs">Model</Label>
                  <Select value={ai.model} onValueChange={(v) => updateAIConfig({ model: v })}>
                    <SelectTrigger className="w-36 h-7 text-xs bg-secondary border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isFireworks ? FIREWORKS_MODELS : isZAI ? ZAI_MODELS : OPENROUTER_MODELS)
                        .filter((m) => m.tier === modelTier)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </SettingRow>
              </>
            )}
            {!isProviderWithModels && (
              <SettingRow>
                <Label className="text-xs">Model</Label>
                <Input
                  value={ai.model}
                  onChange={(e) => updateAIConfig({ model: e.target.value })}
                  placeholder={isOllama ? 'llama3' : 'model-name'}
                  className="w-28 h-7 text-xs bg-secondary border-0 rounded-md"
                />
              </SettingRow>
            )}
            <div className="flex flex-col gap-1.5 py-2">
              <Label className="text-xs">Base URL</Label>
              <Input
                value={ai.baseUrl}
                onChange={(e) => updateAIConfig({ baseUrl: e.target.value })}
                placeholder={isOllama ? 'http://localhost:11434' : 'https://openrouter.ai/api/v1'}
                className="h-7 text-xs bg-secondary border-0 rounded-md"
              />
            </div>
            <div className="pt-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={handleTestConnection} disabled={testing}>
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
            {connectionStatus && (
              <p className={`text-[0.65rem] pt-1.5 ${connectionStatus.success ? 'text-emerald-600' : 'text-destructive'}`}>
                {connectionStatus.message}
              </p>
            )}
          </>
        )}
      </div>

      <Separator className="my-3" />

      {/* VS Code Bridge */}
      <SectionHeading>VS Code Bridge</SectionHeading>
      <div className="mt-2">
        <SettingRow>
          <Label className="text-xs">Enable VS Code Bridge</Label>
          <Switch
            checked={vscode.enabled}
            onCheckedChange={(v) => {
              updateVSCodeConfig({ enabled: v });
              if (v) {
                setTimeout(handleVSCodeInit, 100);
              }
            }}
          />
        </SettingRow>
        {vscode.enabled && (
          <>
            <SettingRow>
              <Label className="text-xs">Port</Label>
              <Input
                type="number"
                value={vscode.port}
                onChange={(e) => updateVSCodeConfig({ port: Number(e.target.value) || 9456 })}
                className="w-20 h-7 text-xs bg-secondary border-0 rounded-md"
              />
            </SettingRow>
            <SettingRow>
              <Label className="text-xs">Status</Label>
              <div className="flex items-center gap-1.5">
                <span className={`inline-block size-1.5 rounded-full ${vscodeConnected ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                <span className="text-[0.65rem] text-muted-foreground">{vscodeConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </SettingRow>
            <div className="pt-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={handleVSCodeInit}>
                Reconnect
              </Button>
            </div>
          </>
        )}
      </div>

      <Separator className="my-3" />

      {/* Integrations */}
      <SectionHeading>Integrations</SectionHeading>
      <div className="mt-2">
        <SettingRow>
          <Label className="text-xs">GitHub integration</Label>
          <Switch checked={github.enabled} onCheckedChange={(v) => updateGitHubConfig({ enabled: v })} />
        </SettingRow>
        {github.enabled && (
          <div className="flex flex-col gap-1.5 py-2">
            <Label className="text-xs">Personal Access Token</Label>
            <Input
              type="password"
              value={github.token}
              onChange={(e) => updateGitHubConfig({ token: e.target.value })}
              placeholder="ghp_..."
              className="h-7 text-xs bg-secondary border-0 rounded-md"
            />
          </div>
        )}
        <Separator />
        <SettingRow>
          <Label className="text-xs">Usage telemetry</Label>
          <Switch checked={enableTelemetry} onCheckedChange={(v) => updateSetting('enableTelemetry', v)} />
        </SettingRow>
      </div>

      <Separator className="my-3" />

      {/* Reset */}
      <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={resetToDefaults}>
        Reset to defaults
      </Button>

      <p className="text-center text-[0.6rem] text-muted-foreground pt-3 pb-1">
        FDH v1.0.0
      </p>
    </div>
    </ScrollArea>
  );
}
