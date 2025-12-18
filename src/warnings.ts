/**
 * Warning types for non-fatal issues during generation
 */

export type WarningType =
  | 'UniqueValueExhaustion'
  | 'ConstraintRetryLimit'
  | 'ConstraintEvaluationError'
  | 'MutationTargetNotFound'
  | 'UnknownFieldInImportedSchema';

export interface VagueWarning {
  type: WarningType;
  message: string;
  field?: string;
  schema?: string;
  dataset?: string;
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
 * Warning for when constraint satisfaction reaches retry limit
 */
export interface ConstraintRetryLimitWarning extends VagueWarning {
  type: 'ConstraintRetryLimit';
  schema?: string;
  dataset?: string;
  attempts: number;
  mode: 'satisfying' | 'violating';
}

/**
 * Warning for when constraint evaluation throws an error
 */
export interface ConstraintEvaluationErrorWarning extends VagueWarning {
  type: 'ConstraintEvaluationError';
  error: string;
}

/**
 * Warning for when a mutation target cannot be resolved
 */
export interface MutationTargetNotFoundWarning extends VagueWarning {
  type: 'MutationTargetNotFound';
  schema: string;
}

/**
 * Warning for when a schema extends an imported schema but adds fields not in the original
 */
export interface UnknownFieldInImportedSchemaWarning extends VagueWarning {
  type: 'UnknownFieldInImportedSchema';
  schema: string;
  field: string;
  importedFrom: string;
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

  /**
   * Get warnings of a specific type
   */
  getWarningsByType<T extends VagueWarning>(type: WarningType): T[] {
    return this.warnings.filter((w) => w.type === type) as T[];
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

/**
 * Helper to create a ConstraintRetryLimitWarning
 */
export function createConstraintRetryWarning(
  attempts: number,
  mode: 'satisfying' | 'violating',
  schema?: string,
  dataset?: string
): ConstraintRetryLimitWarning {
  const target = schema ? `schema '${schema}'` : dataset ? `dataset '${dataset}'` : 'data';
  return {
    type: 'ConstraintRetryLimit',
    message: `Could not generate ${mode} data for ${target} after ${attempts} attempts.`,
    schema,
    dataset,
    attempts,
    mode,
  };
}

/**
 * Helper to create a ConstraintEvaluationErrorWarning
 */
export function createConstraintEvaluationErrorWarning(
  error: string
): ConstraintEvaluationErrorWarning {
  return {
    type: 'ConstraintEvaluationError',
    message: `Constraint evaluation failed: ${error}`,
    error,
  };
}

/**
 * Helper to create a MutationTargetNotFoundWarning
 */
export function createMutationTargetNotFoundWarning(schema: string): MutationTargetNotFoundWarning {
  return {
    type: 'MutationTargetNotFound',
    message: `Could not resolve mutation target in schema '${schema}'.`,
    schema,
  };
}

/**
 * Helper to create an UnknownFieldInImportedSchemaWarning
 */
export function createUnknownFieldWarning(
  schema: string,
  field: string,
  importedFrom: string
): UnknownFieldInImportedSchemaWarning {
  return {
    type: 'UnknownFieldInImportedSchema',
    message: `Field '${field}' in schema '${schema}' does not exist in imported schema '${importedFrom}'. This field will be added to the output but is not part of the original OpenAPI schema.`,
    schema,
    field,
    importedFrom,
  };
}
