/**
 * Warning types for non-fatal issues during generation
 */

export type WarningType =
  | 'UniqueValueExhaustion'
  | 'ConstraintRetryLimit'
  | 'EmptyCollectionReference';

export interface VagueWarning {
  type: WarningType;
  message: string;
  field?: string;
  schema?: string;
}

/**
 * Warning for when unique value generation exhausts available values
 */
export interface UniqueValueExhaustionWarning extends VagueWarning {
  type: 'UniqueValueExhaustion';
  field: string;
  schema: string;
  attempts: number;
}

/**
 * Collector for warnings during generation
 */
class WarningCollector {
  private warnings: VagueWarning[] = [];

  add(warning: VagueWarning): void {
    this.warnings.push(warning);
    // Also log to console for visibility
    console.warn(`[vague] ${warning.type}: ${warning.message}`);
  }

  getWarnings(): VagueWarning[] {
    return [...this.warnings];
  }

  clear(): void {
    this.warnings = [];
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }
}

// Global warning collector instance
export const warningCollector = new WarningCollector();

/**
 * Helper to create a UniqueValueExhaustionWarning
 */
export function createUniqueExhaustionWarning(
  schema: string,
  field: string,
  attempts: number
): UniqueValueExhaustionWarning {
  return {
    type: 'UniqueValueExhaustion',
    message: `Could not generate unique value for '${schema}.${field}' after ${attempts} attempts. Duplicate values may exist.`,
    schema,
    field,
    attempts,
  };
}
