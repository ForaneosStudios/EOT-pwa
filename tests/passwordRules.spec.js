import { describe, expect, it } from 'vitest';
import { PASSWORD_MAX_LENGTH, passwordError } from '../src/services/passwordRules.js';

describe('password rules', () => {
  it('matches the sign-up requirements', () => {
    expect(passwordError('')).toMatch(/obligatoria/);
    expect(passwordError('Abc1')).toMatch(/8 caracteres/);
    expect(passwordError('abcdefg1')).toMatch(/mayúscula/);
    expect(passwordError('Abcdefgh')).toMatch(/mayúscula/);
    expect(passwordError(`A1${'a'.repeat(PASSWORD_MAX_LENGTH)}`)).toMatch(/superar/);
    expect(passwordError('Abcdefg1')).toBe('');
  });
});
