/**
 * Form Debugger Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Form Debugger', () => {
  let form: HTMLFormElement;

  beforeEach(() => {
    form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="username" required>
      <input type="email" name="email" required>
      <input type="password" name="password" minlength="8">
      <button type="submit">Submit</button>
    `;
    document.body.appendChild(form);
  });

  afterEach(() => {
    form.remove();
  });

  describe('Form Analysis', () => {
    it('should count form fields', () => {
      const inputs = form.querySelectorAll('input');
      expect(inputs.length).toBe(3);
    });

    it('should detect required fields', () => {
      const required = form.querySelectorAll('[required]');
      expect(required.length).toBe(2);
    });

    it('should detect validation attributes', () => {
      const password = form.querySelector('input[type="password"]');
      expect(password?.getAttribute('minlength')).toBe('8');
    });
  });

  describe('Validation', () => {
    it('should check form validity', () => {
      const username = form.querySelector('input[name="username"]') as HTMLInputElement;
      username.value = '';
      
      expect(username.validity.valid).toBe(false);
      expect(username.validity.valueMissing).toBe(true);
    });

    it('should validate email format', () => {
      const email = form.querySelector('input[type="email"]') as HTMLInputElement;
      email.value = 'invalid-email';
      
      expect(email.validity.valid).toBe(false);
      expect(email.validity.typeMismatch).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should check for associated labels', () => {
      const input = form.querySelector('input');
      const id = input?.id;
      const label = document.querySelector(`label[for="${id}"]`);
      
      // In our test HTML there's no label
      expect(label).toBeNull();
    });
  });
});
