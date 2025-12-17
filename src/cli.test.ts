import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const CLI_PATH = join(__dirname, '..', 'dist', 'cli.js');
const EXAMPLES_DIR = join(__dirname, '..', 'examples');
const TMP_DIR = join(__dirname, '..', '.test-tmp');

function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args}`, {
      encoding: 'utf-8',
      cwd: __dirname,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.status ?? 1,
    };
  }
}

describe('CLI', () => {
  beforeAll(() => {
    // Ensure dist is built
    if (!existsSync(CLI_PATH)) {
      throw new Error('CLI not built. Run `npm run build` first.');
    }
    // Create temp directory for test outputs
    if (!existsSync(TMP_DIR)) {
      mkdirSync(TMP_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp files after each test
    if (existsSync(TMP_DIR)) {
      rmSync(TMP_DIR, { recursive: true, force: true });
      mkdirSync(TMP_DIR, { recursive: true });
    }
  });

  describe('help and usage', () => {
    it('shows help with --help flag', () => {
      const result = runCLI('--help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('vague - Declarative test data generator');
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Options:');
    });

    it('shows help with -h flag', () => {
      const result = runCLI('-h');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('vague - Declarative test data generator');
    });

    it('shows help when no arguments provided', () => {
      const result = runCLI('');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });
  });

  describe('basic generation', () => {
    it('generates JSON output from a .vague file', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}"`);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('companies');
      expect(output).toHaveProperty('invoices');
      expect(output.companies).toHaveLength(10);
      expect(output.invoices).toHaveLength(50);
    });

    it('outputs pretty JSON with -p flag', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -p`);
      expect(result.exitCode).toBe(0);
      // Pretty-printed JSON has newlines and indentation
      expect(result.stdout).toContain('\n');
      expect(result.stdout).toMatch(/^\{\n\s+/);
    });

    it('outputs pretty JSON with --pretty flag', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --pretty`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('\n');
    });
  });

  describe('output file', () => {
    it('writes to file with -o flag', () => {
      const outputPath = join(TMP_DIR, 'output.json');
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -o "${outputPath}"`);

      expect(result.exitCode).toBe(0);
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      const output = JSON.parse(content);
      expect(output).toHaveProperty('companies');
    });

    it('writes to file with --output flag', () => {
      const outputPath = join(TMP_DIR, 'output2.json');
      const result = runCLI(
        `"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --output "${outputPath}"`
      );

      expect(result.exitCode).toBe(0);
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe('seeded generation', () => {
    it('produces deterministic output with -s flag', () => {
      const result1 = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -s 12345`);
      const result2 = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -s 12345`);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result1.stdout).toBe(result2.stdout);
    });

    it('produces deterministic output with --seed flag', () => {
      const result1 = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --seed 99999`);
      const result2 = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --seed 99999`);

      expect(result1.stdout).toBe(result2.stdout);
    });

    it('produces different output with different seeds', () => {
      const result1 = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -s 11111`);
      const result2 = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -s 22222`);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result1.stdout).not.toBe(result2.stdout);
    });

    it('rejects invalid seed value', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -s notanumber`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Seed must be a valid integer');
    });
  });

  describe('error handling', () => {
    it('fails with error for non-existent file', () => {
      const result = runCLI('nonexistent.vague');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
    });

    it('fails with error for invalid .vague syntax', () => {
      const invalidFile = join(TMP_DIR, 'invalid.vague');
      writeFileSync(invalidFile, 'this is not valid vague syntax {{{');

      const result = runCLI(`"${invalidFile}"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
    });

    it('fails with error for invalid mapping JSON', () => {
      const result = runCLI(
        `"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -v "${join(EXAMPLES_DIR, 'openapi-examples-generation', 'petstore.json')}" -m "not valid json"`
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid JSON for schema mapping');
    });
  });

  describe('OpenAPI validation', () => {
    it('loads schemas from OpenAPI spec with -v flag', () => {
      const result = runCLI(
        `"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -v "${join(EXAMPLES_DIR, 'openapi-examples-generation', 'petstore.json')}"`
      );

      expect(result.exitCode).toBe(0);
      // Should produce JSON output
      expect(result.stdout).toBeTruthy();
      const output = JSON.parse(result.stdout);
      expect(output).toBeDefined();
    });

    it('validates with mapping', () => {
      // Create a minimal vague file that generates data matching petstore schema
      const vagueFile = join(TMP_DIR, 'petstore-test.vague');
      writeFileSync(
        vagueFile,
        `
schema Pet {
  id: int in 1..1000,
  name: string,
  tag: string?
}

dataset Test {
  pets: 5 of Pet
}
`
      );

      const result = runCLI(
        `"${vagueFile}" -v "${join(EXAMPLES_DIR, 'openapi-examples-generation', 'petstore.json')}" -m '{"pets": "Pet"}'`
      );

      expect(result.exitCode).toBe(0);
      // Should produce JSON output
      expect(result.stdout).toBeTruthy();
    });

    it('supports --validate-only flag to suppress output', () => {
      const vagueFile = join(TMP_DIR, 'petstore-test2.vague');
      writeFileSync(
        vagueFile,
        `
schema Pet {
  id: int in 1..1000,
  name: string,
  tag: string?
}

dataset Test {
  pets: 5 of Pet
}
`
      );

      const result = runCLI(
        `"${vagueFile}" -v "${join(EXAMPLES_DIR, 'openapi-examples-generation', 'petstore.json')}" -m '{"pets": "Pet"}' --validate-only`
      );

      // With --validate-only, stdout should be empty (no JSON output)
      expect(result.stdout.trim()).toBe('');
    });
  });

  describe('OpenAPI example population', () => {
    it('requires --oas-source when using --oas-output', () => {
      const outputPath = join(TMP_DIR, 'populated.json');
      const result = runCLI(
        `"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --oas-output "${outputPath}"`
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--oas-source is required');
    });

    it('populates OpenAPI spec with examples', () => {
      const outputPath = join(TMP_DIR, 'populated-petstore.json');
      const vagueFile = join(TMP_DIR, 'petstore-gen.vague');
      writeFileSync(
        vagueFile,
        `
schema Pet {
  id: int in 1..1000,
  name: string,
  tag: string?
}

dataset Test {
  pets: 5 of Pet
}
`
      );

      const result = runCLI(
        `"${vagueFile}" --oas-output "${outputPath}" --oas-source "${join(EXAMPLES_DIR, 'openapi-examples-generation', 'petstore.json')}" -m '{"pets": "Pet"}'`
      );

      expect(result.exitCode).toBe(0);
      expect(existsSync(outputPath)).toBe(true);
      // Output file should contain the populated spec
      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toBeTruthy();
    });

    it('rejects invalid --oas-example-count', () => {
      const result = runCLI(
        `"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --oas-output out.json --oas-source "${join(EXAMPLES_DIR, 'openapi-examples-generation', 'petstore.json')}" --oas-example-count 0`
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--oas-example-count must be a positive integer');
    });

    it('rejects non-numeric --oas-example-count', () => {
      const result = runCLI(
        `"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --oas-output out.json --oas-source "${join(EXAMPLES_DIR, 'openapi-examples-generation', 'petstore.json')}" --oas-example-count abc`
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--oas-example-count must be a positive integer');
    });
  });

  describe('watch mode', () => {
    it('shows watch option in help', () => {
      const result = runCLI('--help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('-w, --watch');
      expect(result.stdout).toContain('Watch input file and regenerate on changes');
    });

    it('requires output file with -w flag', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" -w`);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Watch mode requires -o/--output to be specified');
    });

    it('requires output file with --watch flag', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'basic.vague')}" --watch`);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Watch mode requires -o/--output to be specified');
    });
  });

  describe('complex examples', () => {
    it('handles constraints example', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'constraints.vague')}" -s 42`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toBeDefined();
    });

    it('handles cross-ref example', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'cross-ref.vague')}" -s 42`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toBeDefined();
    });

    it('handles computed-fields example', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'computed-fields.vague')}" -s 42`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toBeDefined();
    });

    it('handles dynamic-cardinality example', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'dynamic-cardinality.vague')}" -s 42`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toBeDefined();
    });

    it('handles dataset-constraints example', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'dataset-constraints.vague')}" -s 42`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toBeDefined();
    });

    it('handles conditional-fields example', () => {
      const result = runCLI(`"${join(EXAMPLES_DIR, 'basics', 'conditional-fields.vague')}" -s 42`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toBeDefined();
      // Verify conditional fields work - business accounts should have companyNumber
      const businessAccounts = output.accounts.filter(
        (a: Record<string, unknown>) => a.type === 'business'
      );
      const personalAccounts = output.accounts.filter(
        (a: Record<string, unknown>) => a.type === 'personal'
      );
      if (businessAccounts.length > 0) {
        expect(businessAccounts[0]).toHaveProperty('companyNumber');
      }
      if (personalAccounts.length > 0) {
        expect(personalAccounts[0]).not.toHaveProperty('companyNumber');
      }
    });
  });
});
