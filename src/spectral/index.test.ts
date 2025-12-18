import { describe, it, expect } from 'vitest';
import { SpectralLinter, lintOpenAPISpec, formatLintResults } from './index.js';

describe('SpectralLinter', () => {
  describe('lintContent', () => {
    it('should detect missing info description', async () => {
      const linter = new SpectralLinter();
      const spec = JSON.stringify({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      });

      const result = await linter.lintContent(spec);

      expect(result.warningCount).toBeGreaterThan(0);
      expect(result.results.some((r) => r.code === 'info-description')).toBe(true);
    });

    it('should pass for valid minimal spec', async () => {
      const linter = new SpectralLinter();
      const spec = JSON.stringify({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          description: 'A test API',
          version: '1.0.0',
          contact: {
            name: 'Test',
            email: 'test@example.com',
          },
        },
        servers: [{ url: 'https://api.example.com' }],
        paths: {},
      });

      const result = await linter.lintContent(spec);

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('should detect missing paths content', async () => {
      const linter = new SpectralLinter();
      const spec = JSON.stringify({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        // Missing paths entirely
      });

      const result = await linter.lintContent(spec);

      // Should have some issues (either warnings or errors)
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should handle YAML format', async () => {
      const linter = new SpectralLinter();
      const yamlSpec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths: {}
`;

      const result = await linter.lintContent(yamlSpec, 'yaml');

      // Should still detect missing description
      expect(result.results.some((r) => r.code === 'info-description')).toBe(true);
    });
  });

  describe('lint (file)', () => {
    it('should lint petstore.json example', async () => {
      const result = await lintOpenAPISpec('examples/openapi-importing/petstore.json');

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.errorCount).toBe('number');
      expect(typeof result.warningCount).toBe('number');
      expect(Array.isArray(result.results)).toBe(true);
    });
  });
});

describe('formatLintResults', () => {
  it('should format empty results', () => {
    const result = formatLintResults({
      valid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      hintCount: 0,
      results: [],
    });

    expect(result).toBe('No issues found.');
  });

  it('should format results with errors', () => {
    const result = formatLintResults({
      valid: false,
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      hintCount: 0,
      results: [
        {
          path: 'info.description',
          code: 'info-description',
          message: 'Info must have description',
          severity: 'error',
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 10 },
          },
        },
      ],
    });

    expect(result).toContain('✗');
    expect(result).toContain('info-description');
    expect(result).toContain('1 error');
  });

  it('should format results with warnings', () => {
    const result = formatLintResults({
      valid: true,
      errorCount: 0,
      warningCount: 2,
      infoCount: 0,
      hintCount: 0,
      results: [
        {
          path: 'info.contact',
          code: 'info-contact',
          message: 'Info should have contact',
          severity: 'warn',
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 10 },
          },
        },
        {
          path: 'servers',
          code: 'oas3-api-servers',
          message: 'Servers should be defined',
          severity: 'warn',
          range: {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 10 },
          },
        },
      ],
    });

    expect(result).toContain('⚠');
    expect(result).toContain('2 warnings');
  });

  it('should hide hints by default', () => {
    const result = formatLintResults({
      valid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      hintCount: 1,
      results: [
        {
          path: 'components.schemas.Pet.description',
          code: 'oas3-schema-description',
          message: 'Schema should have description',
          severity: 'hint',
          range: {
            start: { line: 10, character: 0 },
            end: { line: 10, character: 10 },
          },
        },
      ],
    });

    expect(result).not.toContain('💡');
  });

  it('should show hints when verbose', () => {
    const result = formatLintResults(
      {
        valid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        hintCount: 1,
        results: [
          {
            path: 'components.schemas.Pet.description',
            code: 'oas3-schema-description',
            message: 'Schema should have description',
            severity: 'hint',
            range: {
              start: { line: 10, character: 0 },
              end: { line: 10, character: 10 },
            },
          },
        ],
      },
      true
    );

    expect(result).toContain('💡');
    expect(result).toContain('1 hint');
  });

  it('should show paths when verbose', () => {
    const result = formatLintResults(
      {
        valid: true,
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
        hintCount: 0,
        results: [
          {
            path: 'info.contact',
            code: 'info-contact',
            message: 'Info should have contact',
            severity: 'warn',
            range: {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 10 },
            },
          },
        ],
      },
      true
    );

    expect(result).toContain('at: info.contact');
  });
});
