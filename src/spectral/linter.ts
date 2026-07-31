/**
 * Spectral-based OpenAPI linter implementation.
 */

import spectralCore from '@stoplight/spectral-core';
import spectralRulesets from '@stoplight/spectral-rulesets';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import spectralParsers from '@stoplight/spectral-parsers';

const { Spectral, Document } = spectralCore;
const { oas } = spectralRulesets;
const Parsers = spectralParsers;

type RulesetDefinition = Parameters<InstanceType<typeof Spectral>['setRuleset']>[0];

// Diagnostic type from Spectral
interface SpectralDiagnostic {
  path: (string | number)[];
  code: string | number;
  message: string;
  severity: number;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface SpectralResult {
  path: string;
  code: string;
  message: string;
  severity: 'error' | 'warn' | 'info' | 'hint';
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface LintResult {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  hintCount: number;
  results: SpectralResult[];
}

const SEVERITY_MAP: Record<number, SpectralResult['severity']> = {
  0: 'error',
  1: 'warn',
  2: 'info',
  3: 'hint',
};

export class SpectralLinter {
  private spectral: InstanceType<typeof Spectral>;
  private initialized = false;

  constructor() {
    this.spectral = new Spectral();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Use the default OpenAPI ruleset
    this.spectral.setRuleset(oas as unknown as RulesetDefinition);

    this.initialized = true;
  }

  async lint(specPath: string): Promise<LintResult> {
    await this.initialize();

    const content = readFileSync(resolve(specPath), 'utf-8');
    const isYaml = specPath.endsWith('.yaml') || specPath.endsWith('.yml');

    // Parse the document based on format
    const parser = isYaml ? Parsers.Yaml : Parsers.Json;
    const document = new Document(content, parser as typeof Parsers.Json, specPath);

    const diagnostics = (await this.spectral.run(document)) as SpectralDiagnostic[];

    const results: SpectralResult[] = diagnostics.map((d: SpectralDiagnostic) => ({
      path: d.path.join('.'),
      code: String(d.code),
      message: d.message,
      severity: SEVERITY_MAP[d.severity] || 'info',
      range: {
        start: { line: d.range.start.line + 1, character: d.range.start.character },
        end: { line: d.range.end.line + 1, character: d.range.end.character },
      },
    }));

    const errorCount = results.filter((r) => r.severity === 'error').length;
    const warningCount = results.filter((r) => r.severity === 'warn').length;
    const infoCount = results.filter((r) => r.severity === 'info').length;
    const hintCount = results.filter((r) => r.severity === 'hint').length;

    return {
      valid: errorCount === 0,
      errorCount,
      warningCount,
      infoCount,
      hintCount,
      results,
    };
  }

  async lintContent(content: string, format: 'json' | 'yaml' = 'json'): Promise<LintResult> {
    await this.initialize();

    const parser = format === 'yaml' ? Parsers.Yaml : Parsers.Json;
    const document = new Document(content, parser as typeof Parsers.Json, 'inline-spec');

    const diagnostics = (await this.spectral.run(document)) as SpectralDiagnostic[];

    const results: SpectralResult[] = diagnostics.map((d: SpectralDiagnostic) => ({
      path: d.path.join('.'),
      code: String(d.code),
      message: d.message,
      severity: SEVERITY_MAP[d.severity] || 'info',
      range: {
        start: { line: d.range.start.line + 1, character: d.range.start.character },
        end: { line: d.range.end.line + 1, character: d.range.end.character },
      },
    }));

    const errorCount = results.filter((r) => r.severity === 'error').length;
    const warningCount = results.filter((r) => r.severity === 'warn').length;
    const infoCount = results.filter((r) => r.severity === 'info').length;
    const hintCount = results.filter((r) => r.severity === 'hint').length;

    return {
      valid: errorCount === 0,
      errorCount,
      warningCount,
      infoCount,
      hintCount,
      results,
    };
  }
}

/**
 * Convenience function to lint an OpenAPI spec file
 */
export async function lintOpenAPISpec(specPath: string): Promise<LintResult> {
  const linter = new SpectralLinter();
  return linter.lint(specPath);
}

/**
 * Format lint results for display
 */
export function formatLintResults(result: LintResult, verbose = false): string {
  const lines: string[] = [];

  if (result.results.length === 0) {
    lines.push('No issues found.');
    return lines.join('\n');
  }

  // Group by severity
  const grouped = {
    error: result.results.filter((r) => r.severity === 'error'),
    warn: result.results.filter((r) => r.severity === 'warn'),
    info: result.results.filter((r) => r.severity === 'info'),
    hint: result.results.filter((r) => r.severity === 'hint'),
  };

  const symbols = {
    error: '✗',
    warn: '⚠',
    info: 'ℹ',
    hint: '💡',
  };

  for (const severity of ['error', 'warn', 'info', 'hint'] as const) {
    const items = grouped[severity];
    if (items.length === 0) continue;

    if (!verbose && severity === 'hint') continue; // Skip hints unless verbose

    for (const item of items) {
      const loc = `${item.range.start.line}:${item.range.start.character}`;
      lines.push(`  ${symbols[severity]} ${loc} ${item.code}: ${item.message}`);
      if (verbose && item.path) {
        lines.push(`    at: ${item.path}`);
      }
    }
  }

  // Summary
  lines.push('');
  const parts: string[] = [];
  if (result.errorCount > 0)
    parts.push(`${result.errorCount} error${result.errorCount !== 1 ? 's' : ''}`);
  if (result.warningCount > 0)
    parts.push(`${result.warningCount} warning${result.warningCount !== 1 ? 's' : ''}`);
  if (result.infoCount > 0) parts.push(`${result.infoCount} info`);
  if (verbose && result.hintCount > 0)
    parts.push(`${result.hintCount} hint${result.hintCount !== 1 ? 's' : ''}`);

  lines.push(`Found ${parts.join(', ')}`);

  return lines.join('\n');
}
