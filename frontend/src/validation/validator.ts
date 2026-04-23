/**
 * validation/validator.ts
 * Runs all rules from rules.ts against the current graph and returns
 * a structured result grouped by severity.
 *
 * Call runValidation() before starting simulation.
 * The UI layer decides what to show based on hasErrors / hasWarnings.
 */

import { VALIDATION_RULES } from './rules'
import type { ValidationContext, ValidationIssue } from './types'

export interface ValidationReport {
  errors:    ValidationIssue[]
  warnings:  ValidationIssue[]
  advisories: ValidationIssue[]
  /** True if simulation must be blocked. */
  hasErrors:   boolean
  /** True if the "Run anyway" sheet should be shown. */
  hasWarnings: boolean
}

export function runValidation(ctx: ValidationContext): ValidationReport {
  const errors:     ValidationIssue[] = []
  const warnings:   ValidationIssue[] = []
  const advisories: ValidationIssue[] = []

  for (const rule of VALIDATION_RULES) {
    const issues = rule.check(ctx)
    for (const issue of issues) {
      if (issue.severity === 'error')    errors.push(issue)
      if (issue.severity === 'warning')  warnings.push(issue)
      if (issue.severity === 'advisory') advisories.push(issue)
    }
  }

  return {
    errors,
    warnings,
    advisories,
    hasErrors:   errors.length > 0,
    hasWarnings: warnings.length > 0,
  }
}
