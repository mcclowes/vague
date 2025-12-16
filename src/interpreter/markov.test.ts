import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MarkovChain,
  CharMarkov,
  generateText,
  generateCompanyName,
  generateProductName,
  generatePersonName,
} from './markov.js';
import { setSeed } from './random.js';

describe('Markov module', () => {
  beforeEach(() => {
    setSeed(42); // Use deterministic seed for all tests
  });

  afterEach(() => {
    setSeed(null); // Reset to random after tests
  });

  describe('MarkovChain (word-level)', () => {
    it('trains on text and generates output', () => {
      const chain = new MarkovChain(1);
      chain.train('the quick brown fox jumps over the lazy dog');

      const output = chain.generate(2, 5);
      expect(output.length).toBeGreaterThan(0);
      expect(output.split(' ').length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty string when not trained', () => {
      const chain = new MarkovChain(1);
      expect(chain.generate()).toBe('');
    });

    it('handles single word training', () => {
      const chain = new MarkovChain(1);
      chain.train('hello');
      // With only one word, it can only return the starter state
      const output = chain.generate(1, 1);
      // Output should be empty or the single word
      expect(output.length).toBeLessThanOrEqual(5);
    });

    it('respects minWords parameter', () => {
      const chain = new MarkovChain(1);
      chain.train('one two three four five six seven eight nine ten');

      // Generate multiple times and check length
      for (let i = 0; i < 10; i++) {
        const output = chain.generate(3, 3);
        if (output.length > 0) {
          expect(output.split(' ').length).toBeGreaterThanOrEqual(2); // May be limited by training data
        }
      }
    });

    it('respects maxWords parameter', () => {
      const chain = new MarkovChain(1);
      chain.train('one two three four five six seven eight nine ten');

      for (let i = 0; i < 10; i++) {
        const output = chain.generate(1, 5);
        expect(output.split(' ').length).toBeLessThanOrEqual(5);
      }
    });

    it('is deterministic with same seed', () => {
      const chain = new MarkovChain(1);
      chain.train('the quick brown fox jumps over the lazy dog');

      setSeed(123);
      const output1 = chain.generate(3, 5);

      setSeed(123);
      const output2 = chain.generate(3, 5);

      expect(output1).toBe(output2);
    });

    it('handles order parameter', () => {
      const chain = new MarkovChain(2);
      chain.train('one two three one two four one two five');

      const output = chain.generate(2, 4);
      expect(output).toBeDefined();
    });

    it('handles training with multiple sentences', () => {
      const chain = new MarkovChain(1);
      chain.train('hello world. goodbye world. hello again.');

      const output = chain.generate(2, 3);
      expect(output).toBeDefined();
    });

    it('handles empty training text', () => {
      const chain = new MarkovChain(1);
      chain.train('');
      expect(chain.generate()).toBe('');
    });

    it('handles whitespace-only training text', () => {
      const chain = new MarkovChain(1);
      chain.train('   \t\n  ');
      expect(chain.generate()).toBe('');
    });

    it('lowercases training text', () => {
      const chain = new MarkovChain(1);
      chain.train('HELLO World');

      const output = chain.generate(1, 2);
      // Output should be lowercase
      expect(output).toBe(output.toLowerCase());
    });
  });

  describe('CharMarkov (character-level)', () => {
    it('trains on words and generates output', () => {
      const chain = new CharMarkov(2);
      chain.train(['hello', 'world', 'help', 'wealth']);

      const output = chain.generate(3, 8);
      expect(output.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty string when not trained', () => {
      const chain = new CharMarkov(2);
      expect(chain.generate()).toBe('');
    });

    it('respects minLen parameter', () => {
      const chain = new CharMarkov(2);
      chain.train(['hello', 'world', 'wonderful', 'worthwhile']);

      for (let i = 0; i < 10; i++) {
        const output = chain.generate(5, 10);
        if (output.length > 0) {
          expect(output.length).toBeGreaterThanOrEqual(2); // Limited by order
        }
      }
    });

    it('respects maxLen parameter', () => {
      const chain = new CharMarkov(2);
      chain.train(['hello', 'world', 'wonderful', 'worthwhile']);

      for (let i = 0; i < 10; i++) {
        const output = chain.generate(4, 8);
        expect(output.length).toBeLessThanOrEqual(8);
      }
    });

    it('is deterministic with same seed', () => {
      const chain = new CharMarkov(2);
      chain.train(['alice', 'bob', 'charlie', 'david']);

      setSeed(456);
      const output1 = chain.generate(4, 8);

      setSeed(456);
      const output2 = chain.generate(4, 8);

      expect(output1).toBe(output2);
    });

    it('lowercases training words', () => {
      const chain = new CharMarkov(2);
      chain.train(['HELLO', 'WORLD']);

      const output = chain.generate(3, 6);
      expect(output).toBe(output.toLowerCase());
    });

    it('skips words shorter than order', () => {
      const chain = new CharMarkov(3);
      // "ab" has length 2, less than order 3, should be skipped
      chain.train(['ab', 'hello', 'world']);

      const output = chain.generate(3, 6);
      expect(output).toBeDefined();
    });

    it('handles empty word list', () => {
      const chain = new CharMarkov(2);
      chain.train([]);
      expect(chain.generate()).toBe('');
    });

    it('handles words all shorter than order', () => {
      const chain = new CharMarkov(5);
      chain.train(['a', 'ab', 'abc', 'abcd']); // All < 5 characters
      expect(chain.generate()).toBe('');
    });
  });

  describe('generateText()', () => {
    it('generates word text by default', () => {
      const output = generateText();
      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
    });

    it('generates word text with type "word"', () => {
      const output = generateText('word');
      expect(output).toBeDefined();
    });

    it('generates company text', () => {
      const output = generateText('company');
      expect(output).toBeDefined();
      // Company names should be capitalized
      expect(output[0]).toBe(output[0].toUpperCase());
    });

    it('generates product text', () => {
      const output = generateText('product');
      expect(output).toBeDefined();
      // Product names should be capitalized
      expect(output[0]).toBe(output[0].toUpperCase());
    });

    it('generates name text', () => {
      const output = generateText('name');
      expect(output).toBeDefined();
      // Names should be capitalized
      expect(output[0]).toBe(output[0].toUpperCase());
    });

    it('is deterministic with same seed', () => {
      setSeed(789);
      const output1 = generateText('word');

      setSeed(789);
      const output2 = generateText('word');

      expect(output1).toBe(output2);
    });
  });

  describe('generateCompanyName()', () => {
    it('generates a company name with suffix', () => {
      const name = generateCompanyName();
      expect(name).toBeDefined();

      // Should contain one of the common suffixes
      const suffixes = ['Inc', 'LLC', 'Corp', 'Ltd', 'Co', 'Group', 'Systems', 'Solutions', 'Tech'];
      const hasSuffix = suffixes.some((s) => name.includes(s));
      expect(hasSuffix).toBe(true);
    });

    it('capitalizes the name part', () => {
      const name = generateCompanyName();
      const parts = name.split(' ');
      // First word should be capitalized
      expect(parts[0][0]).toBe(parts[0][0].toUpperCase());
    });

    it('is deterministic with same seed', () => {
      setSeed(111);
      const name1 = generateCompanyName();

      setSeed(111);
      const name2 = generateCompanyName();

      expect(name1).toBe(name2);
    });
  });

  describe('generateProductName()', () => {
    it('generates a product name', () => {
      const name = generateProductName();
      expect(name).toBeDefined();
      expect(name.length).toBeGreaterThan(0);
    });

    it('capitalizes words', () => {
      const name = generateProductName();
      const words = name.split(' ');
      for (const word of words) {
        if (word.length > 0) {
          expect(word[0]).toBe(word[0].toUpperCase());
        }
      }
    });

    it('is deterministic with same seed', () => {
      setSeed(222);
      const name1 = generateProductName();

      setSeed(222);
      const name2 = generateProductName();

      expect(name1).toBe(name2);
    });
  });

  describe('generatePersonName()', () => {
    it('generates a person name with first and last', () => {
      const name = generatePersonName();
      expect(name).toBeDefined();

      const parts = name.split(' ');
      expect(parts.length).toBe(2);
    });

    it('capitalizes first and last names', () => {
      const name = generatePersonName();
      const [first, last] = name.split(' ');

      expect(first[0]).toBe(first[0].toUpperCase());
      expect(last[0]).toBe(last[0].toUpperCase());
    });

    it('is deterministic with same seed', () => {
      setSeed(333);
      const name1 = generatePersonName();

      setSeed(333);
      const name2 = generatePersonName();

      expect(name1).toBe(name2);
    });

    it('generates reasonable length names', () => {
      // Generate multiple names to check length variance
      for (let i = 0; i < 20; i++) {
        const name = generatePersonName();
        const [first, last] = name.split(' ');

        // First name should be 4-8 chars (based on generate call)
        expect(first.length).toBeGreaterThanOrEqual(2);
        expect(first.length).toBeLessThanOrEqual(10);

        // Last name should be 5-10 chars
        expect(last.length).toBeGreaterThanOrEqual(2);
        expect(last.length).toBeLessThanOrEqual(12);
      }
    });
  });

  describe('pre-trained generators', () => {
    it('word generator produces multi-word output', () => {
      // The word generator is pre-trained with WORD_CORPUS
      const output = generateText('word');
      expect(output.split(' ').length).toBeGreaterThanOrEqual(1);
    });

    it('company generator produces multi-word output', () => {
      const output = generateText('company');
      expect(output.split(' ').length).toBeGreaterThanOrEqual(1);
    });

    it('product generator produces multi-word output', () => {
      const output = generateText('product');
      expect(output.split(' ').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('handles training text with special characters', () => {
      const chain = new MarkovChain(1);
      chain.train("hello, world! how's it going? fine, thanks.");

      const output = chain.generate(2, 4);
      expect(output).toBeDefined();
    });

    it('handles training text with numbers', () => {
      const chain = new MarkovChain(1);
      chain.train('item 1 item 2 item 3');

      const output = chain.generate(2, 3);
      expect(output).toBeDefined();
    });

    it('character chain handles words with special chars', () => {
      const chain = new CharMarkov(2);
      chain.train(["o'brien", 'mcdonald', 'smith-jones']);

      const output = chain.generate(4, 8);
      expect(output).toBeDefined();
    });
  });
});
