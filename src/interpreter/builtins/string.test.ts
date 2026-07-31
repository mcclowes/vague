import { describe, it, expect } from 'vitest';
import { stringFunctions } from './string.js';
import type { GeneratorContext } from '../context.js';

// Mock context for testing
const mockContext = {} as GeneratorContext;

describe('String Functions', () => {
  describe('uppercase', () => {
    it('converts string to uppercase', () => {
      expect(stringFunctions.uppercase(['hello'], mockContext)).toBe('HELLO');
    });

    it('handles mixed case', () => {
      expect(stringFunctions.uppercase(['HeLLo WoRLD'], mockContext)).toBe('HELLO WORLD');
    });

    it('handles already uppercase', () => {
      expect(stringFunctions.uppercase(['HELLO'], mockContext)).toBe('HELLO');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.uppercase([null], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.uppercase([undefined], mockContext)).toBe('');
    });

    it('converts numbers to string and uppercases', () => {
      expect(stringFunctions.uppercase([123], mockContext)).toBe('123');
    });

    it('handles empty string', () => {
      expect(stringFunctions.uppercase([''], mockContext)).toBe('');
    });

    it('handles special characters', () => {
      expect(stringFunctions.uppercase(['hello!@#$'], mockContext)).toBe('HELLO!@#$');
    });

    it('handles Unicode characters', () => {
      expect(stringFunctions.uppercase(['café'], mockContext)).toBe('CAFÉ');
    });

    it('handles accented characters', () => {
      expect(stringFunctions.uppercase(['über'], mockContext)).toBe('ÜBER');
    });
  });

  describe('lowercase', () => {
    it('converts string to lowercase', () => {
      expect(stringFunctions.lowercase(['HELLO'], mockContext)).toBe('hello');
    });

    it('handles mixed case', () => {
      expect(stringFunctions.lowercase(['HeLLo WoRLD'], mockContext)).toBe('hello world');
    });

    it('handles already lowercase', () => {
      expect(stringFunctions.lowercase(['hello'], mockContext)).toBe('hello');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.lowercase([null], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.lowercase([undefined], mockContext)).toBe('');
    });

    it('converts numbers to string', () => {
      expect(stringFunctions.lowercase([123], mockContext)).toBe('123');
    });

    it('handles empty string', () => {
      expect(stringFunctions.lowercase([''], mockContext)).toBe('');
    });

    it('handles Unicode characters', () => {
      expect(stringFunctions.lowercase(['CAFÉ'], mockContext)).toBe('café');
    });
  });

  describe('capitalize', () => {
    it('capitalizes each word', () => {
      expect(stringFunctions.capitalize(['hello world'], mockContext)).toBe('Hello World');
    });

    it('handles single word', () => {
      expect(stringFunctions.capitalize(['hello'], mockContext)).toBe('Hello');
    });

    it('handles already capitalized', () => {
      expect(stringFunctions.capitalize(['Hello World'], mockContext)).toBe('Hello World');
    });

    it('lowercases rest of word', () => {
      expect(stringFunctions.capitalize(['HELLO WORLD'], mockContext)).toBe('Hello World');
    });

    it('handles mixed case within words', () => {
      expect(stringFunctions.capitalize(['hELLO wORLD'], mockContext)).toBe('Hello World');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.capitalize([null], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.capitalize([undefined], mockContext)).toBe('');
    });

    it('handles empty string', () => {
      expect(stringFunctions.capitalize([''], mockContext)).toBe('');
    });

    it('handles multiple spaces', () => {
      expect(stringFunctions.capitalize(['hello  world'], mockContext)).toBe('Hello  World');
    });

    it('handles single character words', () => {
      expect(stringFunctions.capitalize(['a b c'], mockContext)).toBe('A B C');
    });
  });

  describe('kebabCase', () => {
    it('converts space-separated to kebab-case', () => {
      expect(stringFunctions.kebabCase(['hello world'], mockContext)).toBe('hello-world');
    });

    it('converts camelCase to kebab-case', () => {
      expect(stringFunctions.kebabCase(['helloWorld'], mockContext)).toBe('hello-world');
    });

    it('converts PascalCase to kebab-case', () => {
      expect(stringFunctions.kebabCase(['HelloWorld'], mockContext)).toBe('hello-world');
    });

    it('converts underscores to hyphens', () => {
      expect(stringFunctions.kebabCase(['hello_world'], mockContext)).toBe('hello-world');
    });

    it('handles already kebab-case', () => {
      expect(stringFunctions.kebabCase(['hello-world'], mockContext)).toBe('hello-world');
    });

    it('converts to lowercase', () => {
      expect(stringFunctions.kebabCase(['HELLO WORLD'], mockContext)).toBe('hello-world');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.kebabCase([null], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.kebabCase([undefined], mockContext)).toBe('');
    });

    it('handles empty string', () => {
      expect(stringFunctions.kebabCase([''], mockContext)).toBe('');
    });

    it('handles multiple consecutive spaces', () => {
      expect(stringFunctions.kebabCase(['hello  world'], mockContext)).toBe('hello-world');
    });

    it('handles mixed separators', () => {
      expect(stringFunctions.kebabCase(['hello_world test'], mockContext)).toBe('hello-world-test');
    });
  });

  describe('snakeCase', () => {
    it('converts space-separated to snake_case', () => {
      expect(stringFunctions.snakeCase(['hello world'], mockContext)).toBe('hello_world');
    });

    it('converts camelCase to snake_case', () => {
      expect(stringFunctions.snakeCase(['helloWorld'], mockContext)).toBe('hello_world');
    });

    it('converts PascalCase to snake_case', () => {
      expect(stringFunctions.snakeCase(['HelloWorld'], mockContext)).toBe('hello_world');
    });

    it('converts hyphens to underscores', () => {
      expect(stringFunctions.snakeCase(['hello-world'], mockContext)).toBe('hello_world');
    });

    it('handles already snake_case', () => {
      expect(stringFunctions.snakeCase(['hello_world'], mockContext)).toBe('hello_world');
    });

    it('converts to lowercase', () => {
      expect(stringFunctions.snakeCase(['HELLO WORLD'], mockContext)).toBe('hello_world');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.snakeCase([null], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.snakeCase([undefined], mockContext)).toBe('');
    });

    it('handles empty string', () => {
      expect(stringFunctions.snakeCase([''], mockContext)).toBe('');
    });

    it('handles mixed separators', () => {
      expect(stringFunctions.snakeCase(['hello-world test'], mockContext)).toBe('hello_world_test');
    });
  });

  describe('camelCase', () => {
    it('converts space-separated to camelCase', () => {
      expect(stringFunctions.camelCase(['hello world'], mockContext)).toBe('helloWorld');
    });

    it('converts kebab-case to camelCase', () => {
      expect(stringFunctions.camelCase(['hello-world'], mockContext)).toBe('helloWorld');
    });

    it('converts snake_case to camelCase', () => {
      expect(stringFunctions.camelCase(['hello_world'], mockContext)).toBe('helloWorld');
    });

    it('handles already camelCase', () => {
      expect(stringFunctions.camelCase(['helloWorld'], mockContext)).toBe('helloWorld');
    });

    it('converts PascalCase to camelCase', () => {
      expect(stringFunctions.camelCase(['HelloWorld'], mockContext)).toBe('helloWorld');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.camelCase([null], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.camelCase([undefined], mockContext)).toBe('');
    });

    it('handles empty string', () => {
      expect(stringFunctions.camelCase([''], mockContext)).toBe('');
    });

    it('handles multiple consecutive separators', () => {
      expect(stringFunctions.camelCase(['hello--world'], mockContext)).toBe('helloWorld');
    });

    it('handles single word', () => {
      expect(stringFunctions.camelCase(['hello'], mockContext)).toBe('hello');
    });

    it('lowercases first character of single uppercase word', () => {
      // camelCase lowercases the first char but doesn't affect the rest without separators
      const result = stringFunctions.camelCase(['HELLO'], mockContext);
      expect(result.charAt(0)).toBe('h');
    });
  });

  describe('trim', () => {
    it('removes leading and trailing whitespace', () => {
      expect(stringFunctions.trim(['  hello  '], mockContext)).toBe('hello');
    });

    it('removes only leading whitespace', () => {
      expect(stringFunctions.trim(['  hello'], mockContext)).toBe('hello');
    });

    it('removes only trailing whitespace', () => {
      expect(stringFunctions.trim(['hello  '], mockContext)).toBe('hello');
    });

    it('preserves internal whitespace', () => {
      expect(stringFunctions.trim(['  hello world  '], mockContext)).toBe('hello world');
    });

    it('handles tabs and newlines', () => {
      expect(stringFunctions.trim(['\t\nhello\t\n'], mockContext)).toBe('hello');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.trim([null], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.trim([undefined], mockContext)).toBe('');
    });

    it('handles empty string', () => {
      expect(stringFunctions.trim([''], mockContext)).toBe('');
    });

    it('handles whitespace-only string', () => {
      expect(stringFunctions.trim(['   '], mockContext)).toBe('');
    });

    it('handles no whitespace', () => {
      expect(stringFunctions.trim(['hello'], mockContext)).toBe('hello');
    });
  });

  describe('concat', () => {
    it('concatenates two strings', () => {
      expect(stringFunctions.concat(['hello', ' world'], mockContext)).toBe('hello world');
    });

    it('concatenates multiple strings', () => {
      expect(stringFunctions.concat(['a', 'b', 'c', 'd'], mockContext)).toBe('abcd');
    });

    it('handles empty array', () => {
      expect(stringFunctions.concat([], mockContext)).toBe('');
    });

    it('handles single string', () => {
      expect(stringFunctions.concat(['hello'], mockContext)).toBe('hello');
    });

    it('converts numbers to strings', () => {
      expect(stringFunctions.concat(['value: ', 42], mockContext)).toBe('value: 42');
    });

    it('handles null values as empty string', () => {
      expect(stringFunctions.concat(['hello', null, 'world'], mockContext)).toBe('helloworld');
    });

    it('handles undefined values as empty string', () => {
      expect(stringFunctions.concat(['hello', undefined, 'world'], mockContext)).toBe('helloworld');
    });

    it('handles mixed types', () => {
      expect(stringFunctions.concat(['str', 123, true], mockContext)).toBe('str123true');
    });
  });

  describe('substring', () => {
    it('extracts substring from start to end', () => {
      expect(stringFunctions.substring(['hello world', 0, 5], mockContext)).toBe('hello');
    });

    it('extracts substring from start to string end', () => {
      expect(stringFunctions.substring(['hello world', 6], mockContext)).toBe('world');
    });

    it('extracts middle substring', () => {
      expect(stringFunctions.substring(['hello world', 3, 8], mockContext)).toBe('lo wo');
    });

    it('handles start index 0', () => {
      expect(stringFunctions.substring(['hello', 0, 3], mockContext)).toBe('hel');
    });

    it('uses 0 as default start', () => {
      expect(stringFunctions.substring(['hello'], mockContext)).toBe('hello');
    });

    it('returns empty string for null', () => {
      expect(stringFunctions.substring([null, 0, 5], mockContext)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(stringFunctions.substring([undefined, 0, 5], mockContext)).toBe('');
    });

    it('handles empty string', () => {
      expect(stringFunctions.substring(['', 0, 5], mockContext)).toBe('');
    });

    it('handles end beyond string length', () => {
      expect(stringFunctions.substring(['hello', 0, 100], mockContext)).toBe('hello');
    });

    it('handles start beyond string length', () => {
      expect(stringFunctions.substring(['hello', 100], mockContext)).toBe('');
    });
  });

  describe('replace', () => {
    it('replaces first occurrence', () => {
      expect(stringFunctions.replace(['hello hello', 'hello', 'hi'], mockContext)).toBe('hi hello');
    });

    it('handles no match', () => {
      expect(stringFunctions.replace(['hello', 'world', 'hi'], mockContext)).toBe('hello');
    });

    it('replaces with empty string', () => {
      expect(stringFunctions.replace(['hello world', ' world', ''], mockContext)).toBe('hello');
    });

    it('replaces empty string (prepends)', () => {
      expect(stringFunctions.replace(['hello', '', 'hi '], mockContext)).toBe('hi hello');
    });

    it('returns empty string for null input', () => {
      expect(stringFunctions.replace([null, 'a', 'b'], mockContext)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(stringFunctions.replace([undefined, 'a', 'b'], mockContext)).toBe('');
    });

    it('handles null search as empty string', () => {
      expect(stringFunctions.replace(['hello', null, 'hi '], mockContext)).toBe('hi hello');
    });

    it('handles null replacement as empty string', () => {
      expect(stringFunctions.replace(['hello', 'l', null], mockContext)).toBe('helo');
    });

    it('handles special regex characters literally', () => {
      expect(stringFunctions.replace(['hello.world', '.', '-'], mockContext)).toBe('hello-world');
    });
  });

  describe('length', () => {
    it('returns length of string', () => {
      expect(stringFunctions.length(['hello'], mockContext)).toBe(5);
    });

    it('returns 0 for empty string', () => {
      expect(stringFunctions.length([''], mockContext)).toBe(0);
    });

    it('returns 0 for null', () => {
      expect(stringFunctions.length([null], mockContext)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(stringFunctions.length([undefined], mockContext)).toBe(0);
    });

    it('counts spaces', () => {
      expect(stringFunctions.length(['hello world'], mockContext)).toBe(11);
    });

    it('converts number to string and counts', () => {
      expect(stringFunctions.length([12345], mockContext)).toBe(5);
    });

    it('handles Unicode characters', () => {
      expect(stringFunctions.length(['café'], mockContext)).toBe(4);
    });

    it('counts emoji as multiple characters (surrogate pairs)', () => {
      // Most emoji are 2 UTF-16 code units
      expect(stringFunctions.length(['👋'], mockContext)).toBe(2);
    });
  });
});
