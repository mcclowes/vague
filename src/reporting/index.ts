/**
 * Enterprise Reporting Module
 *
 * Provides audit trails, compliance documentation, and organizational
 * risk management features for enterprise adoption.
 */

export * from './types.js';
export {
  hashString,
  calcFieldStatistics,
  calcCollectionStatistics,
  compareReports,
  generateReport,
  createAuditLogEntry,
  formatAuditLogEntry,
} from './collector.js';
export { formatReportAsHTML, formatReportAsMarkdown, formatReportAsJSON } from './formatters.js';
