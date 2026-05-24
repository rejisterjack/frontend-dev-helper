import { describe, it, expect } from 'vitest';
import {
  toolActivationStateSchema,
  extensionSettingsSchema,
  llmConfigSchema,
  toggleToolPayloadSchema,
} from '@/lib/validators';

describe('validators', () => {
  describe('toolActivationStateSchema', () => {
    it('should accept valid activation states', () => {
      expect(toolActivationStateSchema.parse('active')).toBe('active');
      expect(toolActivationStateSchema.parse('inactive')).toBe('inactive');
      expect(toolActivationStateSchema.parse('loading')).toBe('loading');
      expect(toolActivationStateSchema.parse('error')).toBe('error');
    });

    it('should reject invalid activation states', () => {
      expect(() => toolActivationStateSchema.parse('unknown')).toThrow();
      expect(() => toolActivationStateSchema.parse('')).toThrow();
    });
  });

  describe('extensionSettingsSchema', () => {
    it('should accept valid settings', () => {
      const settings = {
        theme: 'dark',
        fontSize: 'medium',
        showTooltips: true,
        autoActivate: false,
        overlayOpacity: 0.8,
        highlightColor: '#3b82f6',
        persistState: true,
        devToolsIntegration: true,
        keyboardShortcuts: true,
        compactMode: false,
        notifications: true,
        animationSpeed: 'normal',
      };
      const result = extensionSettingsSchema.parse(settings);
      expect(result.theme).toBe('dark');
    });

    it('should reject invalid theme', () => {
      const settings = {
        theme: 'invalid',
        fontSize: 'medium',
        showTooltips: true,
        autoActivate: false,
        overlayOpacity: 0.8,
        highlightColor: '#3b82f6',
        persistState: true,
        devToolsIntegration: true,
        keyboardShortcuts: true,
        compactMode: false,
        notifications: true,
        animationSpeed: 'normal',
      };
      expect(() => extensionSettingsSchema.parse(settings)).toThrow();
    });

    it('should reject invalid highlightColor format', () => {
      const settings = {
        theme: 'dark',
        fontSize: 'medium',
        showTooltips: true,
        autoActivate: false,
        overlayOpacity: 0.8,
        highlightColor: 'red',
        persistState: true,
        devToolsIntegration: true,
        keyboardShortcuts: true,
        compactMode: false,
        notifications: true,
        animationSpeed: 'normal',
      };
      expect(() => extensionSettingsSchema.parse(settings)).toThrow();
    });

    it('should reject overlayOpacity out of range', () => {
      const settings = {
        theme: 'dark',
        fontSize: 'medium',
        showTooltips: true,
        autoActivate: false,
        overlayOpacity: 2.0,
        highlightColor: '#3b82f6',
        persistState: true,
        devToolsIntegration: true,
        keyboardShortcuts: true,
        compactMode: false,
        notifications: true,
        animationSpeed: 'normal',
      };
      expect(() => extensionSettingsSchema.parse(settings)).toThrow();
    });
  });

  describe('llmConfigSchema', () => {
    it('should accept valid LLM config', () => {
      const config = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        maxTokens: 2000,
        temperature: 0.7,
      };
      const result = llmConfigSchema.parse(config);
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
    });

    it('should reject invalid provider', () => {
      const config = {
        provider: 'invalid',
        model: 'gpt-4',
        apiKey: 'sk-test',
        maxTokens: 2000,
        temperature: 0.7,
      };
      expect(() => llmConfigSchema.parse(config)).toThrow();
    });

    it('should reject empty apiKey', () => {
      const config = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        maxTokens: 2000,
        temperature: 0.7,
      };
      expect(() => llmConfigSchema.parse(config)).toThrow();
    });

    it('should reject temperature out of range', () => {
      const config = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test',
        maxTokens: 2000,
        temperature: 3.0,
      };
      expect(() => llmConfigSchema.parse(config)).toThrow();
    });
  });

  describe('toggleToolPayloadSchema', () => {
    it('should accept valid toggle payload with known toolId', () => {
      const payload = {
        toolId: 'dom-outliner',
        activate: true,
      };
      const result = toggleToolPayloadSchema.parse(payload);
      expect(result.toolId).toBe('dom-outliner');
      expect(result.activate).toBe(true);
    });

    it('should reject unknown toolId', () => {
      const payload = {
        toolId: 'nonexistent-tool',
        activate: true,
      };
      expect(() => toggleToolPayloadSchema.parse(payload)).toThrow();
    });
  });
});
