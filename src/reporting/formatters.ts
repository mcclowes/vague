/**
 * Report Formatters
 *
 * Generate HTML and Markdown reports from GenerationReport data.
 */

import type { GenerationReport, CollectionStatistics, FieldStatistics } from './types.js';

/**
 * Format a number with commas
 */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format a percentage
 */
function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

/**
 * Get status badge color
 */
function getStatusColor(rate: number): string {
  if (rate >= 99) return '#22c55e'; // green
  if (rate >= 90) return '#eab308'; // yellow
  return '#ef4444'; // red
}

/**
 * Generate HTML report
 */
export function formatReportAsHTML(report: GenerationReport): string {
  const statusColor = getStatusColor(report.summary.constraintSatisfactionRate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vague Generation Report - ${report.metadata.generatedAt}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1f2937;
      --muted: #6b7280;
      --border: #e5e7eb;
      --card-bg: #f9fafb;
      --success: #22c55e;
      --warning: #eab308;
      --error: #ef4444;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --text: #f9fafb;
        --muted: #9ca3af;
        --border: #374151;
        --card-bg: #1f2937;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1, h2, h3 { margin-top: 0; }
    h1 { font-size: 1.875rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .subtitle { color: var(--muted); font-size: 0.875rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
    }
    .card-title { font-weight: 600; margin-bottom: 0.5rem; }
    .card-value { font-size: 1.5rem; font-weight: 700; }
    .card-subtitle { color: var(--muted); font-size: 0.75rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success { background: var(--success); color: white; }
    .badge-warning { background: var(--warning); color: black; }
    .badge-error { background: var(--error); color: white; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--border); }
    th { font-weight: 600; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; }
    .attestation {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 2rem;
    }
    @media (prefers-color-scheme: dark) {
      .attestation { background: #1e3a5f; border-color: #60a5fa; }
    }
    .attestation-title { font-weight: 600; color: #3b82f6; margin-bottom: 0.5rem; }
    .warning-item {
      background: #fef3c7;
      border-left: 3px solid var(--warning);
      padding: 0.5rem 1rem;
      margin-bottom: 0.5rem;
    }
    @media (prefers-color-scheme: dark) {
      .warning-item { background: #422006; }
    }
    .comparison-bar {
      height: 8px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    .comparison-fill {
      height: 100%;
      transition: width 0.3s;
    }
    code {
      background: var(--card-bg);
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    .section { margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Vague Generation Report</h1>
    <p class="subtitle">
      Generated: ${report.metadata.generatedAt}<br>
      Report ID: <code>${report.metadata.reportId}</code>
    </p>

    <div class="attestation">
      <div class="attestation-title">Synthetic Data Attestation</div>
      <p style="margin: 0;">${report.attestation.statement}</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Records</div>
        <div class="card-value">${formatNumber(report.summary.totalRecords)}</div>
        <div class="card-subtitle">${report.summary.totalCollections} collection${report.summary.totalCollections !== 1 ? 's' : ''}</div>
      </div>
      <div class="card">
        <div class="card-title">Constraint Satisfaction</div>
        <div class="card-value" style="color: ${statusColor}">
          ${formatPercent(report.summary.constraintSatisfactionRate)}
        </div>
        <div class="card-subtitle">${report.summary.constraintsSatisfied}/${report.summary.constraintsTotal} satisfied</div>
      </div>
      <div class="card">
        <div class="card-title">Generation Time</div>
        <div class="card-value">${formatDuration(report.performance.totalDurationMs)}</div>
        <div class="card-subtitle">${formatNumber(report.performance.recordsPerSecond)} records/sec</div>
      </div>
      <div class="card">
        <div class="card-title">Seed</div>
        <div class="card-value">${report.summary.seed ?? 'Random'}</div>
        <div class="card-subtitle">${report.summary.seed ? 'Deterministic' : 'Non-reproducible'}</div>
      </div>
    </div>

    ${
      report.warnings.length > 0
        ? `
    <div class="section">
      <h2>Warnings (${report.warnings.length})</h2>
      ${report.warnings
        .slice(0, 10)
        .map(
          (w) => `
        <div class="warning-item">
          <strong>${w.type}</strong>: ${w.message}
        </div>
      `
        )
        .join('')}
      ${report.warnings.length > 10 ? `<p style="color: var(--muted);">... and ${report.warnings.length - 10} more</p>` : ''}
    </div>
    `
        : ''
    }

    ${
      report.comparisons && report.comparisons.length > 0
        ? `
    <div class="section">
      <h2>Distribution Changes from Baseline</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Divergence</th>
            <th style="width: 200px;">Change</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.comparisons
            .slice(0, 20)
            .map(
              (c) => `
          <tr>
            <td><code>${c.field}</code></td>
            <td>${(c.divergence * 100).toFixed(1)}%</td>
            <td>
              <div class="comparison-bar">
                <div class="comparison-fill" style="width: ${c.divergence * 100}%; background: ${c.significant ? 'var(--warning)' : 'var(--success)'}"></div>
              </div>
            </td>
            <td>
              <span class="badge ${c.significant ? 'badge-warning' : 'badge-success'}">
                ${c.significant ? 'Changed' : 'Stable'}
              </span>
            </td>
          </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <div class="section">
      <h2>Collections</h2>
      ${report.collections.map((coll) => formatCollectionHTML(coll)).join('')}
    </div>

    <div class="section" style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border);">
      <h2>Report Metadata</h2>
      <table>
        <tbody>
          <tr><td style="width: 200px;"><strong>Generator</strong></td><td>${report.metadata.generatorVersion}</td></tr>
          <tr><td><strong>Schema Hash</strong></td><td><code>${report.input.schemaHash}</code></td></tr>
          ${report.input.schemaFile ? `<tr><td><strong>Schema File</strong></td><td><code>${report.input.schemaFile}</code></td></tr>` : ''}
          ${report.input.configFile ? `<tr><td><strong>Config File</strong></td><td><code>${report.input.configFile}</code></td></tr>` : ''}
          ${report.metadata.hostname ? `<tr><td><strong>Hostname</strong></td><td>${report.metadata.hostname}</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Format a single collection for HTML
 */
function formatCollectionHTML(coll: CollectionStatistics): string {
  return `
    <div class="card" style="margin-bottom: 1rem;">
      <div class="card-title">${coll.name} <span style="color: var(--muted); font-weight: normal;">(${coll.schemaName})</span></div>
      <p style="margin: 0.5rem 0;">${formatNumber(coll.recordCount)} records</p>
      ${
        coll.fields.length > 0
          ? `
      <table style="font-size: 0.875rem;">
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Null %</th>
            <th>Unique</th>
            <th>Stats</th>
          </tr>
        </thead>
        <tbody>
          ${coll.fields.map((f) => formatFieldHTML(f)).join('')}
        </tbody>
      </table>
      `
          : ''
      }
    </div>
  `;
}

/**
 * Format a single field for HTML
 */
function formatFieldHTML(field: FieldStatistics): string {
  let stats = '-';
  if (field.numeric) {
    stats = `min: ${field.numeric.min.toFixed(2)}, max: ${field.numeric.max.toFixed(2)}, μ: ${field.numeric.mean.toFixed(2)}`;
  } else if (field.string) {
    stats = `len: ${field.string.minLength}-${field.string.maxLength}`;
  }

  return `
    <tr>
      <td><code>${field.name}</code></td>
      <td>${field.type}</td>
      <td>${formatPercent(field.nullPercentage)}</td>
      <td>${field.uniqueCount} (${formatPercent(field.cardinality)})</td>
      <td style="font-size: 0.75rem; color: var(--muted);">${stats}</td>
    </tr>
  `;
}

/**
 * Generate Markdown report
 */
export function formatReportAsMarkdown(report: GenerationReport): string {
  const lines: string[] = [];

  lines.push(`# Vague Generation Report`);
  lines.push('');
  lines.push(`**Generated:** ${report.metadata.generatedAt}`);
  lines.push(`**Report ID:** \`${report.metadata.reportId}\``);
  lines.push('');

  // Attestation
  lines.push('## Synthetic Data Attestation');
  lines.push('');
  lines.push(`> ${report.attestation.statement}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Records | ${formatNumber(report.summary.totalRecords)} |`);
  lines.push(`| Collections | ${report.summary.totalCollections} |`);
  lines.push(
    `| Constraint Satisfaction | ${formatPercent(report.summary.constraintSatisfactionRate)} |`
  );
  lines.push(`| Generation Time | ${formatDuration(report.performance.totalDurationMs)} |`);
  lines.push(`| Records/Second | ${formatNumber(report.performance.recordsPerSecond)} |`);
  lines.push(`| Seed | ${report.summary.seed ?? 'Random'} |`);
  lines.push(`| Warnings | ${report.warnings.length} |`);
  lines.push('');

  // Warnings
  if (report.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const w of report.warnings.slice(0, 10)) {
      lines.push(`- **${w.type}**: ${w.message}`);
    }
    if (report.warnings.length > 10) {
      lines.push(`- ... and ${report.warnings.length - 10} more`);
    }
    lines.push('');
  }

  // Comparisons
  if (report.comparisons && report.comparisons.length > 0) {
    lines.push('## Distribution Changes from Baseline');
    lines.push('');
    lines.push('| Field | Divergence | Status |');
    lines.push('|-------|------------|--------|');
    for (const c of report.comparisons.slice(0, 20)) {
      const status = c.significant ? '⚠️ Changed' : '✓ Stable';
      lines.push(`| \`${c.field}\` | ${(c.divergence * 100).toFixed(1)}% | ${status} |`);
    }
    lines.push('');
  }

  // Collections
  lines.push('## Collections');
  lines.push('');
  for (const coll of report.collections) {
    lines.push(`### ${coll.name} (${coll.schemaName})`);
    lines.push('');
    lines.push(`**${formatNumber(coll.recordCount)} records**`);
    lines.push('');

    if (coll.fields.length > 0) {
      lines.push('| Field | Type | Null % | Unique | Cardinality |');
      lines.push('|-------|------|--------|--------|-------------|');
      for (const f of coll.fields) {
        lines.push(
          `| \`${f.name}\` | ${f.type} | ${formatPercent(f.nullPercentage)} | ${f.uniqueCount} | ${formatPercent(f.cardinality)} |`
        );
      }
      lines.push('');
    }
  }

  // Metadata
  lines.push('## Report Metadata');
  lines.push('');
  lines.push(`- **Generator:** ${report.metadata.generatorVersion}`);
  lines.push(`- **Schema Hash:** \`${report.input.schemaHash}\``);
  if (report.input.schemaFile) {
    lines.push(`- **Schema File:** \`${report.input.schemaFile}\``);
  }
  if (report.input.configFile) {
    lines.push(`- **Config File:** \`${report.input.configFile}\``);
  }
  if (report.metadata.hostname) {
    lines.push(`- **Hostname:** ${report.metadata.hostname}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format report as JSON (pretty-printed)
 */
export function formatReportAsJSON(report: GenerationReport): string {
  return JSON.stringify(report, null, 2);
}
